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
    const EXPIRATION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    let expiredCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process orders in two batches:
    // 1. Orders with paymentExpiresAt set (new orders)
    // 2. Legacy orders without paymentExpiresAt (use createdAt + 30min)

    // Batch 1: Orders with explicit expiration time
    const q1 = adminDb
      .collection("orders")
      .where("status", "==", "pending_payment")
      .where("paymentExpiresAt", "<", now);

    const snapshot1 = await q1.get();
    console.log(`[Cron] Found ${snapshot1.size} expired orders with paymentExpiresAt`);

    // Batch 2: Legacy orders without paymentExpiresAt but old createdAt
    // We query for orders created more than 30 minutes ago
    const legacyCutoff = Timestamp.fromMillis(now.toMillis() - EXPIRATION_WINDOW_MS);
    const q2 = adminDb
      .collection("orders")
      .where("status", "==", "pending_payment")
      .where("createdAt", "<", legacyCutoff);

    const snapshot2 = await q2.get();
    console.log(`[Cron] Found ${snapshot2.size} legacy orders without paymentExpiresAt`);

    // Combine unique orders from both queries
    const processedOrderIds = new Set<string>();
    const allOrdersToExpire: typeof snapshot1.docs = [];

    for (const doc of snapshot1.docs) {
      processedOrderIds.add(doc.id);
      allOrdersToExpire.push(doc);
    }

    for (const doc of snapshot2.docs) {
      if (!processedOrderIds.has(doc.id)) {
        processedOrderIds.add(doc.id);
        allOrdersToExpire.push(doc);
      }
    }

    console.log(`[Cron] Total orders to expire: ${allOrdersToExpire.length}`);

    // Process each expired order
    for (const orderDoc of allOrdersToExpire) {
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
        const isLegacyOrder = !orderData.paymentExpiresAt;
        const timelineEntry = {
          status: "expired",
          time: Timestamp.now(),
          by: "system",
          note: isLegacyOrder 
            ? "Payment window expired (legacy order cleanup)" 
            : "Payment window expired (auto-cleanup)",
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
