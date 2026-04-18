export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { releaseReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

/**
 * GET /api/cron/expire-pending-orders
 * Cron job to automatically expire pending payment orders that have passed their expiration time
 * 
 * This endpoint should be called by a cron scheduler (e.g., Vercel Cron, GitHub Actions)
 * Recommended frequency: Every 5 minutes
 */
export async function GET(req: Request) {
  try {
    // Verify cron secret if configured (prevents unauthorized access)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const now = Timestamp.now();
    let expiredCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Find all pending_payment orders that have expired
    const q = adminDb
      .collection("orders")
      .where("status", "==", "pending_payment")
      .where("paymentExpiresAt", "<", now);

    const snapshot = await q.get();

    console.log(`[Cron] Found ${snapshot.size} expired pending orders`);

    // Process each expired order
    for (const orderDoc of snapshot.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();

      try {
        // Release stock reservation if exists
        if (orderData.reservationId) {
          try {
            await releaseReservation(orderData.reservationId);
          } catch (err: any) {
            console.error(`[Cron] Failed to release stock for ${orderId}:`, err.message);
            // Continue with expiration - stock can be reconciled later
          }
        }

        // Update order status to expired
        const timelineEntry = {
          status: "expired",
          time: Timestamp.now(),
          by: "system",
          note: "Payment window expired (auto-cleanup)",
        };

        await orderDoc.ref.update({
          status: "expired",
          updatedAt: FieldValue.serverTimestamp(),
          timeline: FieldValue.arrayUnion(timelineEntry),
        });

        await auditLog("INFO", {
          event: "ORDER_AUTO_EXPIRED",
          orderId,
          userId: orderData.userId,
          details: {
            originalStatus: orderData.status,
            expiredAt: new Date().toISOString(),
            paymentExpiresAt: orderData.paymentExpiresAt?.toDate?.()?.toISOString(),
          },
        });

        expiredCount++;
      } catch (err: any) {
        console.error(`[Cron] Failed to expire order ${orderId}:`, err.message);
        errorCount++;
        errors.push(`${orderId}: ${err.message}`);
      }
    }

    console.log(`[Cron] Expired ${expiredCount} orders, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      errors: errorCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("[Cron] Expire pending orders error:", err);
    await auditLog("ERROR", {
      event: "CRON_EXPIRE_ORDERS_FAILED",
      error: err.message,
    });
    return NextResponse.json(
      { error: err.message || "Cron job failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/expire-pending-orders
 * Alternative endpoint for manual triggering or different cron providers
 */
export async function POST(req: Request) {
  return GET(req);
}
