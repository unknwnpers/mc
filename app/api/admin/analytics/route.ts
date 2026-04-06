export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    // Parse date range from query params
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "all";
    
    let startDate: Date | null = null;
    let endDate: Date = new Date();
    
    const now = new Date();
    switch (range) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = null;
    }

    // Build order queries based on date range
    let ordersQuery = adminDb.collection("orders").where("status", "in", ["paid", "processing", "shipped", "delivered"]);
    let pendingQuery = adminDb.collection("orders").where("status", "==", "pending_payment");
    
    if (startDate) {
      ordersQuery = ordersQuery.where("createdAt", ">=", startDate);
      ordersQuery = ordersQuery.where("createdAt", "<=", endDate);
      pendingQuery = pendingQuery.where("createdAt", ">=", startDate);
      pendingQuery = pendingQuery.where("createdAt", "<=", endDate);
    }

    const lowStockQuery = adminDb.collection("products")
      .where("isActive", "==", true)
      .where("stock", "<=", 10)
      .orderBy("stock", "asc")
      .limit(5);

    const [ordersSnap, productsSnap, usersSnap, pendingSnap, recentSnap, lowStockSnap] = await Promise.all([
      ordersQuery.get(),
      adminDb.collection("products").where("isActive", "==", true).count().get(),
      adminDb.collection("users").where("role", "==", "customer").count().get(),
      pendingQuery.count().get(),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(8).get(),
      lowStockQuery.get(),
    ]);

    const lowStockProducts = lowStockSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let totalRevenue = 0;
    let codRevenue = 0;
    let codOrderCount = 0;
    const dailyRevenue: Record<string, number> = {};
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    const statusCounts: Record<string, number> = {};
    
    ordersSnap.docs.forEach(doc => {
      const d = doc.data();
      const amount = d.total || d.totalAmount || 0;
      totalRevenue += amount;
      
      // Track COD metrics
      if (d.isCOD) {
        codRevenue += amount;
        codOrderCount++;
      }
      
      // Group by date for chart
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + amount;

      // Count by status
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;

      // Aggregate product sales
      if (d.items && Array.isArray(d.items)) {
        d.items.forEach((item: any) => {
          const productId = item.productId || item.id;
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = { name: item.name || 'Unknown', quantity: 0, revenue: 0 };
            }
            productSales[productId].quantity += item.quantity || 1;
            productSales[productId].revenue += (item.price || 0) * (item.quantity || 1);
          }
        });
      }
    });

    // Convert to array format for chart
    const revenueChart = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    // Get top products
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Convert status counts to array
    const statusBreakdown = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const recentOrders = recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate performance metrics
    const averageOrderValue = ordersSnap.size > 0 ? totalRevenue / ordersSnap.size : 0;
    
    // Get new customers in selected period
    let newCustomersQuery = adminDb.collection("users").where("role", "==", "customer");
    if (startDate) {
      newCustomersQuery = newCustomersQuery.where("createdAt", ">=", startDate);
    }
    const newCustomersSnap = await newCustomersQuery.count().get();

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders:    ordersSnap.size,
        activeProducts: productsSnap.data().count,
        totalCustomers: usersSnap.data().count,
        pendingOrders:  pendingSnap.data().count,
        recentOrders,
        revenueChart,
        topProducts,
        statusBreakdown,
        lowStockProducts,
        averageOrderValue,
        newCustomers: newCustomersSnap.data().count,
        codRevenue,
        codOrderCount,
        onlineRevenue: totalRevenue - codRevenue,
        onlineOrderCount: ordersSnap.size - codOrderCount,
        range,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
