export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const [ordersSnap, productsSnap, usersSnap, pendingSnap, recentSnap] = await Promise.all([
      adminDb.collection("orders").where("status", "in", ["paid", "processing", "shipped", "delivered"]).get(),
      adminDb.collection("products").where("isActive", "==", true).count().get(),
      adminDb.collection("users").where("role", "==", "customer").count().get(),
      adminDb.collection("orders").where("status", "==", "pending_payment").count().get(),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(8).get(),
    ]);

    let totalRevenue = 0;
    ordersSnap.docs.forEach(doc => {
      const d = doc.data();
      totalRevenue += (d.total || d.totalAmount || 0);
    });

    const recentOrders = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders:    ordersSnap.size,
        activeProducts: productsSnap.data().count,
        totalCustomers: usersSnap.data().count,
        pendingOrders:  pendingSnap.data().count,
        recentOrders,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
