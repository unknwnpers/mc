export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { releaseReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

/**
 * POST /api/order/expire
 * Expires a pending payment order and releases stock reservation
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get the order
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data()!;

    // Check if already expired (idempotent)
    if (orderData.status === "expired") {
      return NextResponse.json({
        success: true,
        message: "Order already expired",
        expired: false,
      });
    }

    // Only allow expiring pending_payment orders
    if (orderData.status !== "pending_payment") {
      return NextResponse.json(
        { error: `Cannot expire order with status: ${orderData.status}` },
        { status: 400 }
      );
    }

    // Check if payment has actually expired
    const now = Timestamp.now();
    const expiresAt = orderData.paymentExpiresAt;
    
    if (expiresAt && expiresAt.toMillis() > now.toMillis()) {
      // Payment hasn't expired yet
      const remainingMs = expiresAt.toMillis() - now.toMillis();
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      return NextResponse.json(
        { 
          error: "Payment has not expired yet",
          remainingMinutes: remainingMin,
        },
        { status: 400 }
      );
    }

    // Release stock reservation if exists
    if (orderData.reservationId) {
      try {
        await releaseReservation(orderData.reservationId);
      } catch (err) {
        console.error("Failed to release stock for expired order:", err);
        // Continue with expiration even if stock release fails
        // The cron job or reconciliation will handle it
      }
    }

    // Update order status to expired
    const timelineEntry = {
      status: "expired",
      time: Timestamp.now(),
      by: "system",
      note: "Payment window expired",
    };

    await orderRef.update({
      status: "expired",
      updatedAt: FieldValue.serverTimestamp(),
      timeline: FieldValue.arrayUnion(timelineEntry),
    });

    await auditLog("INFO", {
      event: "ORDER_EXPIRED",
      orderId,
      userId: orderData.userId,
      details: { 
        originalStatus: orderData.status,
        expiredAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order expired successfully",
      expired: true,
    });

  } catch (err: any) {
    console.error("ORDER EXPIRE ERROR:", err);
    await auditLog("ERROR", { 
      event: "ORDER_EXPIRE_FAILED", 
      error: err.message 
    });
    return NextResponse.json(
      { error: err.message || "Failed to expire order" },
      { status: 500 }
    );
  }
}
