export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * Advanced Analytics API
 * Provides cohort analysis, retention, forecasting, and segmentation
 * GET /api/admin/analytics/advanced?type=cohorts|retention|forecast|segments
 */

function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  return new Date(timestamp);
}

// ============================================================================
// COHORT ANALYSIS - Track customer behavior over time
// ============================================================================
async function getCohortAnalysis() {
  const usersSnap = await adminDb.collection("users")
    .where("role", "==", "customer")
    .get();
  
  const ordersSnap = await adminDb.collection("orders")
    .where("status", "in", ["paid", "processing", "shipped", "delivered"])
    .get();

  // Group customers by signup month (cohort)
  const cohorts: Record<string, {
    signupMonth: string;
    customers: number;
    orders: number;
    revenue: number;
    monthsActive: Record<string, { customers: number; revenue: number }>;
  }> = {};

  // Build customer cohorts
  usersSnap.docs.forEach(doc => {
    const data = doc.data();
    const createdAt = toDate(data.createdAt);
    if (!createdAt) return;
    
    const cohortKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    
    if (!cohorts[cohortKey]) {
      cohorts[cohortKey] = {
        signupMonth: cohortKey,
        customers: 0,
        orders: 0,
        revenue: 0,
        monthsActive: {},
      };
    }
    cohorts[cohortKey].customers++;
  });

  // Map orders to cohorts
  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    const userId = data.userId;
    const createdAt = toDate(data.createdAt);
    if (!userId || !createdAt) return;

    // Find user's cohort
    const userDoc = usersSnap.docs.find(u => u.id === userId);
    if (!userDoc) return;
    
    const userCreated = toDate(userDoc.data().createdAt);
    if (!userCreated) return;
    
    const cohortKey = `${userCreated.getFullYear()}-${String(userCreated.getMonth() + 1).padStart(2, '0')}`;
    const orderMonth = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    
    if (!cohorts[cohortKey]) return;
    
    cohorts[cohortKey].orders++;
    cohorts[cohortKey].revenue += data.total || 0;
    
    if (!cohorts[cohortKey].monthsActive[orderMonth]) {
      cohorts[cohortKey].monthsActive[orderMonth] = { customers: 0, revenue: 0 };
    }
    cohorts[cohortKey].monthsActive[orderMonth].revenue += data.total || 0;
  });

  // Calculate retention rates
  const cohortList = Object.values(cohorts)
    .sort((a, b) => b.signupMonth.localeCompare(a.signupMonth))
    .slice(0, 12); // Last 12 cohorts

  return {
    cohorts: cohortList.map(c => ({
      signupMonth: c.signupMonth,
      customers: c.customers,
      totalOrders: c.orders,
      totalRevenue: c.revenue,
      avgRevenuePerCustomer: c.customers > 0 ? c.revenue / c.customers : 0,
      monthlyActivity: c.monthsActive,
    })),
  };
}

// ============================================================================
// CUSTOMER SEGMENTATION - RFM Analysis
// ============================================================================
async function getCustomerSegments() {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const ordersSnap = await adminDb.collection("orders")
    .where("status", "in", ["paid", "processing", "shipped", "delivered"])
    .get();

  const userStats: Record<string, {
    userId: string;
    orders: number;
    totalSpent: number;
    lastOrder: Date | null;
    firstOrder: Date | null;
  }> = {};

  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    const userId = data.userId;
    if (!userId) return;
    
    const orderDate = toDate(data.createdAt);
    const total = data.total || 0;

    if (!userStats[userId]) {
      userStats[userId] = {
        userId,
        orders: 0,
        totalSpent: 0,
        lastOrder: null,
        firstOrder: null,
      };
    }

    userStats[userId].orders++;
    userStats[userId].totalSpent += total;
    
    if (orderDate) {
      if (!userStats[userId].lastOrder || orderDate > userStats[userId].lastOrder!) {
        userStats[userId].lastOrder = orderDate;
      }
      if (!userStats[userId].firstOrder || orderDate < userStats[userId].firstOrder!) {
        userStats[userId].firstOrder = orderDate;
      }
    }
  });

  // RFM Scoring
  const segments = {
    champions: [] as any[],      // High R, F, M
    loyal: [] as any[],          // High F, M
    potential: [] as any[],      // High R, low F
    new: [] as any[],            // Recent first order
    atRisk: [] as any[],         // Low R, high F/M
    lost: [] as any[],           // Very low R
  };

  Object.values(userStats).forEach(user => {
    const recency = user.lastOrder 
      ? Math.floor((now.getTime() - user.lastOrder.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const isRecent = recency <= 30;
    const isFrequent = user.orders >= 3;
    const isHighValue = user.totalSpent >= 3000;

    if (isRecent && isFrequent && isHighValue) {
      segments.champions.push(user);
    } else if (isFrequent && isHighValue) {
      segments.loyal.push(user);
    } else if (isRecent && !isFrequent) {
      segments.potential.push(user);
    } else if (user.orders === 1 && isRecent) {
      segments.new.push(user);
    } else if (!isRecent && (isFrequent || isHighValue)) {
      segments.atRisk.push(user);
    } else if (recency > 90) {
      segments.lost.push(user);
    }
  });

  return {
    segments: {
      champions: { count: segments.champions.length, avgValue: avg(segments.champions.map(c => c.totalSpent)) },
      loyal: { count: segments.loyal.length, avgValue: avg(segments.loyal.map(c => c.totalSpent)) },
      potential: { count: segments.potential.length, avgValue: avg(segments.potential.map(c => c.totalSpent)) },
      new: { count: segments.new.length, avgValue: avg(segments.new.map(c => c.totalSpent)) },
      atRisk: { count: segments.atRisk.length, avgValue: avg(segments.atRisk.map(c => c.totalSpent)) },
      lost: { count: segments.lost.length, avgValue: avg(segments.lost.map(c => c.totalSpent)) },
    },
    totalCustomers: Object.keys(userStats).length,
  };
}

// ============================================================================
// SALES FORECASTING - Simple moving average + trend
// ============================================================================
async function getSalesForecast() {
  const ordersSnap = await adminDb.collection("orders")
    .where("status", "in", ["paid", "processing", "shipped", "delivered"])
    .orderBy("createdAt", "desc")
    .limit(180) // Last 6 months
    .get();

  // Group by week
  const weeklyRevenue: Record<string, number> = {};
  
  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    const date = toDate(data.createdAt);
    if (!date) return;
    
    // Get week key (YYYY-WW)
    const weekKey = getWeekKey(date);
    weeklyRevenue[weekKey] = (weeklyRevenue[weekKey] || 0) + (data.total || 0);
  });

  const sortedWeeks = Object.entries(weeklyRevenue)
    .sort((a, b) => a[0].localeCompare(b[0]));

  // Calculate 4-week moving average
  const movingAvg: number[] = [];
  for (let i = 3; i < sortedWeeks.length; i++) {
    const avg = (sortedWeeks[i][1] + sortedWeeks[i-1][1] + sortedWeeks[i-2][1] + sortedWeeks[i-3][1]) / 4;
    movingAvg.push(avg);
  }

  // Simple trend projection (last 4 weeks trend)
  const last4 = movingAvg.slice(-4);
  const trend = last4.length >= 2 
    ? (last4[last4.length - 1] - last4[0]) / last4.length 
    : 0;

  // Forecast next 4 weeks
  const lastValue = movingAvg[movingAvg.length - 1] || sortedWeeks[sortedWeeks.length - 1]?.[1] || 0;
  const forecast = [];
  for (let i = 1; i <= 4; i++) {
    forecast.push({
      week: `Week +${i}`,
      projectedRevenue: Math.max(0, lastValue + trend * i),
    });
  }

  return {
    historical: sortedWeeks.map(([week, revenue]) => ({ week, revenue })),
    movingAverage: movingAvg.map((v, i) => ({ week: sortedWeeks[i + 3][0], value: v })),
    forecast,
    trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
    trendPercentage: lastValue > 0 ? (trend / lastValue) * 100 : 0,
  };
}

// ============================================================================
// PRODUCT ANALYTICS - Views, conversion, inventory turnover
// ============================================================================
async function getProductAnalytics() {
  const productsSnap = await adminDb.collection("products").get();
  const ordersSnap = await adminDb.collection("orders")
    .where("status", "in", ["paid", "processing", "shipped", "delivered"])
    .get();

  const productStats: Record<string, {
    productId: string;
    name: string;
    views: number;
    orders: number;
    unitsSold: number;
    revenue: number;
    stock: number;
  }> = {};

  // Initialize with product data
  productsSnap.docs.forEach(doc => {
    const data = doc.data();
    const totalStock = (data.variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    
    productStats[doc.id] = {
      productId: doc.id,
      name: data.name,
      views: data.viewCount || 0,
      orders: 0,
      unitsSold: 0,
      revenue: 0,
      stock: totalStock,
    };
  });

  // Aggregate order data
  ordersSnap.docs.forEach(doc => {
    const items = doc.data().items || [];
    items.forEach((item: any) => {
      const productId = item.productId || item.id;
      if (!productStats[productId]) return;
      
      productStats[productId].orders++;
      productStats[productId].unitsSold += item.quantity || 1;
      productStats[productId].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });

  const stats = Object.values(productStats);
  
  return {
    topSelling: stats
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10),
    topRevenue: stats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    lowConversion: stats
      .filter(p => p.views > 100 && p.orders === 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
    inventoryTurnover: stats
      .filter(p => p.stock > 0)
      .map(p => ({
        ...p,
        turnoverRate: p.stock > 0 ? p.unitsSold / p.stock : 0,
      }))
      .sort((a, b) => b.turnoverRate - a.turnoverRate)
      .slice(0, 10),
  };
}

// ============================================================================
// UTILITIES
// ============================================================================
function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.floor(diff / oneWeek) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";

    const result: any = { timestamp: new Date().toISOString() };

    if (type === "all" || type === "cohorts") {
      result.cohorts = await getCohortAnalysis();
    }

    if (type === "all" || type === "segments") {
      result.segments = await getCustomerSegments();
    }

    if (type === "all" || type === "forecast") {
      result.forecast = await getSalesForecast();
    }

    if (type === "all" || type === "products") {
      result.products = await getProductAnalytics();
    }

    return NextResponse.json({ success: true, data: result });

  } catch (err: any) {
    console.error("Advanced Analytics API error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
