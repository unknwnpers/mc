export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { releaseReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    // If you add a CRON_SECRET to Vercel, validate it here to prevent unauthorized triggering
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const now = Date.now();
    const snapshot = await adminDb
      .collection("reservations")
      .where("status", "==", "reserved")
      .where("expiresAt", "<", now)
      .limit(50)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, message: "No expired reservations found", count: 0 });
    }

    let releasedCount = 0;
    for (const doc of snapshot.docs) {
      try {
          await releaseReservation(doc.id);
          releasedCount++;
      } catch (err) {
          console.error(`Failed to release reservation ${doc.id}:`, err);
      }
    }

    if (releasedCount > 0) {
        await auditLog("INFO", {
            event: "CRON_STALE_RESERVATIONS_RELEASED",
            details: `Successfully released ${releasedCount} stale reservations.`
        });
    }

    return NextResponse.json({ success: true, message: "Cleanup completed", count: releasedCount });

  } catch (error: any) {
    console.error("Cron Cleanup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
