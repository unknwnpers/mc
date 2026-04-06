export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

const VALID_STATUSES = ["pending_payment", "paid", "created", "processing", "shipped", "delivered", "cancelled", "failed"];

// ── GET /api/admin/orders ────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const status = searchParams.get("status");

    let query: FirebaseFirestore.Query = adminDb.collection("orders").orderBy("createdAt", "desc").limit(limit);
    if (status && VALID_STATUSES.includes(status)) {
      query = adminDb.collection("orders").where("status", "==", status).orderBy("createdAt", "desc").limit(limit);
    }

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Helper to convert Firestore Timestamp to ISO string
      const convertTimestamp = (ts: any): string | null => {
        if (!ts) return null;
        if (ts.toDate && typeof ts.toDate === "function") {
          return ts.toDate().toISOString();
        }
        if (ts.seconds) {
          return new Date(ts.seconds * 1000).toISOString();
        }
        return null;
      };
      
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt) || data.createdAt,
        updatedAt: convertTimestamp(data.updatedAt) || data.updatedAt,
        // Convert timeline timestamps if present
        timeline: data.timeline?.map((step: any) => ({
          ...step,
          time: convertTimestamp(step.time) || step.time,
        })),
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/orders ──────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { orderId, status } = await req.json();

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: "orderId and status are required" }, { status: 400 });
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const ref = adminDb.collection("orders").doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_order_status",
      resourceId: orderId,
      details: `Status → ${status}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
