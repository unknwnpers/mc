export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// ── GET /api/admin/users ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    );
    const offset = (page - 1) * limit;

    // Fetch all users without orderBy so docs without created_at are included
    // (admins created manually often don't have this field)
    const snap = await adminDb.collection("users").get();
    const totalCount = snap.size;

    // Sort in-memory by created_at descending (nulls last), then paginate
    const allUsers = snap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.created_at?.toDate?.() || data.created_at || null,
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    const users = allUsers.slice(offset, offset + limit);

    return NextResponse.json({ 
      success: true, 
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + users.length < totalCount,
      }
    });
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
