import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    
    // Auth check
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    // 1. Fetch Orders for metrics
    // Since Firebase doesn't support complex aggregations over multiple conditional fields easily without
    // cloud functions or sum() aggregations (which in nextjs admin sdk requires .count() / .sum()), 
    // we'll fetch recent valid orders or assume a moderate volume for now.
    
    // For production scaling, we should use Firebase Aggregation Queries, 
    // but the Firebase Admin SDK Node.js supports count() and sum() on queries.
    
    // Total Revenue (assuming paid, shipped, or delivered statuses)
    const validOrderStatuses = ["paid", "processing", "shipped", "delivered"];
    const ordersSnapshot = await adminDb.collection("orders").where("status", "in", validOrderStatuses).get();
    
    let totalRevenue = 0;
    let totalOrdersCount = ordersSnapshot.size;
    
    ordersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.totalAmount && typeof data.totalAmount === 'number') {
           totalRevenue += data.totalAmount;
        }
    });

    // 2. Count Active Products
    const productsQuery = await adminDb.collection("products").where("is_active", "==", true).count().get();
    const activeProductsCount = productsQuery.data().count;

    // 3. Count Customers
    const customersQuery = await adminDb.collection("users").where("role", "==", "customer").count().get();
    const customersCount = customersQuery.data().count;

    // 4. Get 5 Recent Orders
    const recentOrdersSnap = await adminDb.collection("orders")
                                    .orderBy("created_at", "desc")
                                    .limit(5)
                                    .get();
    
    const recentOrders = recentOrdersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return NextResponse.json({
        success: true,
        data: {
            totalRevenue,
            totalOrders: totalOrdersCount,
            activeProducts: activeProductsCount,
            totalCustomers: customersCount,
            recentOrders
        }
    });

  } catch (error: any) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
