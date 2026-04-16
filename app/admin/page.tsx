"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { TrendingUp, ShoppingBag, Package, Users, Clock, ArrowRight, ArrowUpRight, Calendar, Trophy, AlertTriangle, Download, Plus, Tag, FileText, Activity, Banknote, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_COLORS: Record<string, string> = {
  paid:            "bg-emerald-400/10 text-emerald-400",
  processing:      "bg-amber-400/10 text-amber-400",
  shipped:         "bg-blue-400/10 text-blue-400",
  delivered:       "bg-emerald-400/10 text-emerald-300",
  pending_payment: "bg-yellow-400/10 text-yellow-400",
  cancelled:       "bg-red-400/10 text-red-400",
  failed:          "bg-red-400/10 text-red-500",
};

async function adminGet(url: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    adminGet(`/api/admin/analytics?range=${dateRange}`)
      .then(d => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  function exportDashboard() {
    if (!stats) return;
    
    const data = {
      dateRange: stats.range,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        activeProducts: stats.activeProducts,
        totalCustomers: stats.totalCustomers,
        pendingOrders: stats.pendingOrders,
        averageOrderValue: stats.averageOrderValue,
        newCustomers: stats.newCustomers,
      },
      topProducts: stats.topProducts,
      statusBreakdown: stats.statusBreakdown,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${stats.range}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const CARDS = [
    {
      label: "Total Revenue",
      value: stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : "—",
      icon: TrendingUp,
      color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? "—",
      icon: ShoppingBag,
      color: "from-blue-500/20 to-blue-500/5 border-blue-500/20",
      iconColor: "text-blue-400",
      action: () => router.push("/admin/orders"),
    },
    {
      label: "Active Products",
      value: stats?.activeProducts ?? "—",
      icon: Package,
      color: "from-purple-500/20 to-purple-500/5 border-purple-500/20",
      iconColor: "text-purple-400",
      action: () => router.push("/admin/products"),
    },
    {
      label: "Customers",
      value: stats?.totalCustomers ?? "—",
      icon: Users,
      color: "from-rose-500/20 to-rose-500/5 border-rose-500/20",
      iconColor: "text-rose-400",
      action: () => router.push("/admin/users"),
    },
    {
      label: "Pending Payment",
      value: stats?.pendingOrders ?? "—",
      icon: Clock,
      color: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20",
      iconColor: "text-yellow-400",
    },
    {
      label: "COD Orders",
      value: stats?.codOrderCount ?? "—",
      subValue: stats ? `₹${stats.codRevenue?.toLocaleString("en-IN")}` : "",
      icon: Banknote,
      color: "from-orange-500/20 to-orange-500/5 border-orange-500/20",
      iconColor: "text-orange-400",
      action: () => router.push("/admin/orders?payment=cod"),
    },
    {
      label: "Online Payments",
      value: stats?.onlineOrderCount ?? "—",
      subValue: stats ? `₹${stats.onlineRevenue?.toLocaleString("en-IN")}` : "",
      icon: CreditCard,
      color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20",
      iconColor: "text-cyan-400",
      action: () => router.push("/admin/orders?payment=online"),
    },
  ];

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Dashboard</h1>
          <p className="text-white/30 text-sm mt-1">Your business at a glance</p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-white/40" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
          >
            {DATE_RANGES.map(range => (
              <option key={range.value} value={range.value} className="bg-[#111]">
                {range.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {CARDS.map((c) => (
          <button key={c.label} onClick={c.action}
            className={cn(
              "bg-gradient-to-br border rounded-2xl p-5 text-left transition-all",
              c.color,
              c.action ? "hover:scale-[1.02] cursor-pointer" : "cursor-default"
            )}>
            <div className="flex items-center justify-between mb-4">
              <c.icon className={cn("w-5 h-5", c.iconColor)} />
              {c.action && <ArrowUpRight className="w-3.5 h-3.5 text-white/20" />}
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-black text-white leading-none">{c.value}</p>
                {(c as any).subValue && (
                  <p className="text-sm font-bold text-white/60 mt-1">{(c as any).subValue}</p>
                )}
              </>
            )}
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-2">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Performance Metrics & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Performance Metrics */}
        <Card className="bg-[#111] border-white/[0.06] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white font-black text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/[0.03] rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Avg Order Value</p>
                {loading ? (
                  <div className="h-8 w-20 bg-white/5 rounded animate-pulse mx-auto" />
                ) : (
                  <p className="text-2xl font-black text-white">₹{Math.round(stats?.averageOrderValue || 0).toLocaleString('en-IN')}</p>
                )}
              </div>
              <div className="text-center p-4 bg-white/[0.03] rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">New Customers</p>
                {loading ? (
                  <div className="h-8 w-20 bg-white/5 rounded animate-pulse mx-auto" />
                ) : (
                  <p className="text-2xl font-black text-emerald-400">{stats?.newCustomers || 0}</p>
                )}
              </div>
              <div className="text-center p-4 bg-white/[0.03] rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Revenue/Customer</p>
                {loading ? (
                  <div className="h-8 w-20 bg-white/5 rounded animate-pulse mx-auto" />
                ) : (
                  <p className="text-2xl font-black text-purple-400">
                    ₹{stats?.totalCustomers > 0 ? Math.round((stats?.totalRevenue || 0) / stats?.totalCustomers).toLocaleString('en-IN') : 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white font-black text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-white/5"
                onClick={() => router.push("/admin/products")}
              >
                <Plus className="w-4 h-4" /> Add Product
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-white/5"
                onClick={() => router.push("/admin/orders")}
              >
                <FileText className="w-4 h-4" /> View Orders
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-white/5"
                onClick={() => router.push("/admin/coupons")}
              >
                <Tag className="w-4 h-4" /> Create Coupon
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-white/5"
                onClick={() => exportDashboard()}
              >
                <Download className="w-4 h-4" /> Export Report
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-white/5 text-emerald-400"
                onClick={() => router.push("/admin/analytics")}
              >
                <TrendingUp className="w-4 h-4" /> Advanced Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-[#111] border-white/[0.06] mb-6">
        <CardHeader>
          <CardTitle className="text-white font-black text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
          ) : !stats?.revenueChart?.length ? (
            <div className="h-48 flex items-center justify-center text-white/30">
              No revenue data available
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-48">
                {stats.revenueChart.map((item: any, idx: number) => {
                  const maxRevenue = Math.max(...stats.revenueChart.map((d: any) => d.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="relative w-full">
                        <div
                          className="bg-emerald-500/20 hover:bg-emerald-500/40 transition-all rounded-t"
                          style={{ height: `${Math.max(height, 4)}px` }}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white/10 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          ₹{item.revenue.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-[9px] text-white/30 rotate-45 origin-left translate-y-2">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white font-black text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Top Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !stats?.topProducts?.length ? (
              <div className="h-48 flex items-center justify-center text-white/30">
                No sales data available
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((product: any, idx: number) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      idx === 1 ? "bg-gray-400/20 text-gray-300" :
                      idx === 2 ? "bg-orange-600/20 text-orange-400" :
                      "bg-white/10 text-white/40"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{product.name}</p>
                      <p className="text-white/40 text-xs">{product.quantity} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-sm">₹{product.revenue.toLocaleString('en-IN')}</p>
                      <p className="text-white/30 text-xs">
                        {stats.totalRevenue > 0 ? Math.round((product.revenue / stats.totalRevenue) * 100) : 0}% of revenue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white font-black text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
            ) : !stats?.statusBreakdown?.length ? (
              <div className="h-48 flex items-center justify-center text-white/30">
                No order data available
              </div>
            ) : (
              <div className="space-y-4">
                {stats.statusBreakdown.map((item: any) => {
                  const total = stats.statusBreakdown.reduce((sum: number, s: any) => sum + s.count, 0);
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white/60 text-sm capitalize">{item.status.replace('_', ' ')}</span>
                        <span className="text-white font-bold text-sm">{item.count}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full transition-all", STATUS_COLORS[item.status]?.split(' ')[0] || "bg-white/20")}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {stats?.lowStockProducts?.length > 0 && (
        <Card className="bg-[#111] border-red-500/30 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white font-black text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Low Stock Alerts
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/admin/inventory")}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              Manage Inventory
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {stats.lowStockProducts.map((product: any) => (
                <div 
                  key={product.id} 
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  <p className="text-white font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-red-400 font-bold">{product.stock} left</span>
                    <span className="text-white/40 text-xs">Restock needed</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <h2 className="text-white font-black text-base">Recent Orders</h2>
          <button onClick={() => router.push("/admin/orders")}
            className="flex items-center gap-1.5 text-white/30 hover:text-white text-xs font-bold transition-colors">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !stats?.recentOrders?.length ? (
          <div className="py-16 text-center text-white/20 font-semibold">No orders yet</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {stats.recentOrders.map((order: any) => (
              <div key={order.id} onClick={() => router.push("/admin/orders")}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 font-bold text-sm truncate">
                    {order.recipient?.name || order.userId?.slice(0, 14) + "…"}
                  </p>
                  <p className="text-white/30 text-[11px] font-mono mt-0.5">{order.id.slice(0, 18)}…</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-black text-sm">₹{(order.total || 0).toLocaleString("en-IN")}</p>
                  <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                    STATUS_COLORS[order.status] || "bg-white/5 text-white/40")}>
                    {order.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[
          { label: "Add Product",    href: "/admin/products",  emoji: "➕" },
          { label: "Check Inventory",href: "/admin/inventory", emoji: "📦" },
          { label: "Manage Orders",  href: "/admin/orders",    emoji: "🛒" },
          { label: "View Users",     href: "/admin/users",     emoji: "👥" },
        ].map(item => (
          <button key={item.href} onClick={() => router.push(item.href)}
            className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-2xl px-4 py-5 text-left font-bold text-sm text-white/60 hover:text-white transition-all flex items-center gap-3">
            <span className="text-lg">{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
