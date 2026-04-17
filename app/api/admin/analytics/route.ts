export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// Helper to safely convert Firestore timestamp to Date
function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

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

    // Fetch all orders and filter in-memory to avoid composite index requirements
    const validStatuses = ["paid", "processing", "shipped", "delivered"];
    
    const [ordersSnap, productsSnap, usersSnap, allOrdersSnap, recentSnap] = await Promise.all([
      adminDb.collection("orders").get(),
      adminDb.collection("products").where("isActive", "==", true).count().get(),
      adminDb.collection("users").get(),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(100).get(),
      adminDb.collection("orders").orderBy("createdAt", "desc").limit(8).get(),
    ]);

    // Filter orders in-memory
    const validOrders = ordersSnap.docs.filter(doc => {
      const d = doc.data();
      if (!validStatuses.includes(d.status)) return false;
      if (startDate) {
        const orderDate = toDate(d.createdAt);
        if (!orderDate) return false;
        if (orderDate < startDate || orderDate > endDate) return false;
      }
      return true;
    });

    const pendingOrders = ordersSnap.docs.filter(doc => {
      const d = doc.data();
      if (d.status !== "pending_payment") return false;
      if (startDate) {
        const orderDate = toDate(d.createdAt);
        if (!orderDate) return false;
        if (orderDate < startDate || orderDate > endDate) return false;
      }
      return true;
    });

    // Fetch products for low stock - simplified query without composite index
    const productsForStockSnap = await adminDb.collection("products").where("isActive", "==", true).limit(100).get();
    const lowStockProducts = productsForStockSnap.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
        };
      })
      .filter((p: any) => {
        // Check stock across all variants
        const variants = p.variants || [];
        const minStock = Math.min(...variants.map((v: any) => v.stock ?? Infinity));
        return minStock <= 10;
      })
      .slice(0, 5);

    let totalRevenue = 0;
    let codRevenue = 0;
    let codOrderCount = 0;
    const dailyRevenue: Record<string, number> = {};
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    const statusCounts: Record<string, number> = {};
    
    validOrders.forEach(doc => {
      const d = doc.data();
      const amount = d.total || d.totalAmount || 0;
      totalRevenue += amount;
      
      // Track COD metrics
      if (d.isCOD) {
        codRevenue += amount;
        codOrderCount++;
      }
      
      // Group by date for chart
      const date = toDate(d.createdAt);
      if (date) {
        const dateKey = date.toISOString().split('T')[0];
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + amount;
      }

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

    // Count customers
    const allUsers = usersSnap.docs;
    let newCustomersCount = 0;
    
    // Get customer count from all users snapshot
    const customerCount = allUsers.filter((doc: any) => doc.data()?.role === 'customer').length;
    
    // Count new customers in period
    allUsers.forEach((doc: any) => {
      const d = doc.data();
      if (d.role !== 'customer') return;
      if (startDate) {
        const created = toDate(d.createdAt);
        if (created && created >= startDate) {
          newCustomersCount++;
        }
      } else {
        newCustomersCount++;
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

    const recentOrders = recentSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
      };
    });

    // Calculate performance metrics
    const averageOrderValue = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders:    validOrders.length,
        activeProducts: productsSnap.data().count,
        totalCustomers: customerCount,
        pendingOrders:  pendingOrders.length,
        recentOrders,
        revenueChart,
        topProducts,
        statusBreakdown,
        lowStockProducts,
        averageOrderValue,
        newCustomers: newCustomersCount,
        codRevenue,
        codOrderCount,
        onlineRevenue: totalRevenue - codRevenue,
        onlineOrderCount: validOrders.length - codOrderCount,
        range,
      }
    });
  } catch (err: any) {
    console.error("Analytics API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
