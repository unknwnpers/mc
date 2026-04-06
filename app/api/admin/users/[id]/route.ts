export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { getRecentLogins } from "@/lib/login-history";

// ── GET /api/admin/users/[id] ─────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(req);
    const { id } = await params;

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();

    // Get user's addresses
    const addressesSnap = await adminDb
      .collection("users")
      .doc(id)
      .collection("addresses")
      .get();
    const addresses = addressesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get user's orders (last 50)
    const ordersSnap = await adminDb
      .collection("orders")
      .where("userId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    const orders = ordersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    // Calculate stats - only count paid orders (exclude pending_payment, cancelled, failed)
    const paidStatuses = ["paid", "created", "processing", "shipped", "delivered"];
    const paidOrders = orders.filter((o: any) => paidStatuses.includes(o.status));
    const totalSpent = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
    const orderCount = paidOrders.length;

    // Get login history from login_history collection
    const loginHistory = await getRecentLogins(id, 20);

    // Last login
    const lastLogin = loginHistory.length > 0 ? loginHistory[0].timestamp : null;

    return NextResponse.json({
      success: true,
      user: {
        id: userDoc.id,
        ...userData,
        createdAt: userData?.created_at?.toDate?.() || userData?.created_at,
        lastLogin,
      },
      stats: {
        totalSpent,
        orderCount,
        addressCount: addresses.length,
        lastLogin,
      },
      addresses,
      orders,
      loginHistory: loginHistory.map(log => ({
        id: log.id,
        ip: log.ip,
        userAgent: log.userAgent,
        timestamp: log.timestamp,
        location: log.location,
        isNewDevice: log.isNewDevice,
        isNewLocation: log.isNewLocation,
        status: "SUCCESS", // login_history only stores successful logins
      })),
    });
  } catch (err: any) {
    console.error("Failed to fetch user details:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
