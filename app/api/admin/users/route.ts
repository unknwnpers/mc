export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/users ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const snap = await adminDb.collection("users").orderBy("created_at", "desc").limit(limit).get();
    const users = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to Date for proper serialization
        createdAt: data.created_at?.toDate?.() || data.created_at || null,
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/users  (e.g. change role) ───────────────────────────────
export async function PATCH(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    const { uid, role } = await req.json();

    if (!uid || !role) return NextResponse.json({ success: false, error: "uid and role required" }, { status: 400 });

    const allowedRoles = ["customer", "admin", "superadmin"];
    if (!allowedRoles.includes(role)) return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });

    // Only superadmin can grant admin/superadmin
    if ((role === "admin" || role === "superadmin") && admin.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Only superadmin can promote users" }, { status: 403 });
    }

    await adminDb.collection("users").doc(uid).update({ role, updated_at: FieldValue.serverTimestamp() });

    await adminDb.collection("admin_logs").add({
      adminId: admin.uid,
      action: "update_user_role",
      resourceId: uid,
      details: `Role → ${role}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
