"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { TrendingUp, ShoppingBag, Package, Users, Calendar, Download, Activity, Banknote, CreditCard, Filter, ArrowLeft, Trophy, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
];

async function adminGet(url: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    setLoading(true);
    adminGet(`/api/admin/analytics?range=${dateRange}`)
      .then(d => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dateRange]);

  function exportData() {
    if (!stats) return;
    
    const data = {
      dateRange: stats.range,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        activeProducts: stats.activeProducts,
        totalCustomers: stats.totalCustomers,
        averageOrderValue: stats.averageOrderValue,
        newCustomers: stats.newCustomers,
      },
      paymentMethods: {
        cod: { revenue: stats.codRevenue, orders: stats.codOrderCount },
        online: { revenue: stats.onlineRevenue, orders: stats.onlineOrderCount }
      },
      topProducts: stats.topProducts,
      statusBreakdown: stats.statusBreakdown,
      revenueChart: stats.revenueChart
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${stats.range}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin')}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <Activity className="w-8 h-8 text-emerald-400" />
              Advanced Analytics
            </h1>
            <p className="text-white/30 text-sm mt-1">Deep dive into your business metrics</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <Filter className="w-4 h-4 text-white/40" />
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
          
          <Button 
            onClick={exportData}
            className="bg-blush hover:bg-blush/90 text-white gap-2 px-6 rounded-xl"
          >
            <Download className="w-4 h-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue", value: `₹${stats?.totalRevenue?.toLocaleString('en-IN') || 0}`, icon: TrendingUp, color: "emerald" },
          { label: "Orders", value: stats?.totalOrders || 0, icon: ShoppingBag, color: "blue" },
          { label: "Average Order Value", value: `₹${Math.round(stats?.averageOrderValue || 0).toLocaleString('en-IN')}`, icon: Banknote, color: "purple" },
          { label: "New Customers", value: stats?.newCustomers || 0, icon: Users, color: "rose" }
        ].map((kpi, idx) => (
          <Card key={idx} className="bg-[#111] border-white/[0.06]">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-${kpi.color}-500/10`}>
                  <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
                </div>
              </div>
              <div>
                {loading ? (
                  <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse mb-1" />
                ) : (
                  <h3 className="text-2xl font-black text-white">{kpi.value}</h3>
                )}
                <p className="text-white/40 text-sm font-medium uppercase tracking-wider mt-1">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card className="bg-[#111] border-white/[0.06] lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-white font-black text-base flex justify-between items-center">
              <span>Revenue Trend</span>
              <span className="text-sm font-normal text-white/40">Last 30 Days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            {loading ? (
              <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
            ) : !stats?.revenueChart?.length ? (
              <div className="h-64 flex items-center justify-center text-white/30 border border-white/5 rounded-xl border-dashed">
                No revenue data available for this period
              </div>
            ) : (
              <div className="relative h-64 w-full flex items-end gap-2 pt-10">
                {stats.revenueChart.map((item: any, idx: number) => {
                  const maxRevenue = Math.max(...stats.revenueChart.map((d: any) => d.revenue));
                  const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="w-full relative flex items-end h-full">
                        <div
                          className="w-full bg-emerald-500/20 hover:bg-emerald-500/60 transition-all rounded-t-sm"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#222] border border-white/10 px-3 py-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none shadow-xl">
                          <p className="text-xs text-white/50 mb-1">{item.date}</p>
                          <p className="font-bold">₹{item.revenue.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      {/* X-axis labels (show every Nth label to prevent crowding) */}
                      {idx % Math.ceil(stats.revenueChart.length / 7) === 0 && (
                        <span className="text-[10px] text-white/30 font-medium">
                          {item.date.split('-').slice(1).join('/')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white font-black text-base">Payment Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Online Payments */}
                <div className="p-5 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-cyan-500/20 rounded-xl">
                      <CreditCard className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm font-medium mb-1">Prepaid / Online</p>
                      <p className="text-2xl font-black text-white">₹{(stats?.onlineRevenue || 0).toLocaleString('en-IN')}</p>
                      <p className="text-cyan-400 text-xs font-bold mt-1">{stats?.onlineOrderCount || 0} Orders</p>
                    </div>
                  </div>
                </div>

                {/* Cash on Delivery */}
                <div className="p-5 bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <Banknote className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-white/60 text-sm font-medium mb-1">Cash on Delivery</p>
                      <p className="text-2xl font-black text-white">₹{(stats?.codRevenue || 0).toLocaleString('en-IN')}</p>
                      <p className="text-orange-400 text-xs font-bold mt-1">{stats?.codOrderCount || 0} Orders</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Products */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white font-black text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Top Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : !stats?.topProducts?.length ? (
              <div className="py-12 text-center text-white/30 border border-white/5 border-dashed rounded-xl">No sales data available</div>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((product: any, idx: number) => {
                  const percentage = stats.totalRevenue > 0 ? (product.revenue / stats.totalRevenue) * 100 : 0;
                  return (
                    <div key={product.id} className="group p-4 bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] rounded-xl transition-all">
                      <div className="flex items-center gap-4 mb-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                          idx === 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                          idx === 1 ? "bg-gray-400/20 text-gray-300 border border-gray-400/30" :
                          idx === 2 ? "bg-orange-700/30 text-orange-400 border border-orange-500/30" :
                          "bg-white/5 text-white/40"
                        )}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">{product.name}</p>
                          <p className="text-white/40 text-xs mt-0.5">{product.quantity} Units Sold</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-black">₹{product.revenue.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", idx === 0 ? "bg-yellow-400" : "bg-emerald-400")}
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

        {/* Inventory Intelligence */}
        <Card className="bg-[#111] border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-white font-black text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              Inventory Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-purple-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Total Catalog</p>
                    <p className="text-3xl font-black text-purple-400">{stats?.activeProducts || 0}</p>
                    <p className="text-white/40 text-xs mt-1">Active Products</p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-2">Needs Attention</p>
                    <p className="text-3xl font-black text-red-400">{stats?.lowStockProducts?.length || 0}</p>
                    <p className="text-white/40 text-xs mt-1">Low Stock Items</p>
                  </div>
                </div>

                {stats?.lowStockProducts?.length > 0 && (
                  <div>
                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Critical Stock Alerts
                    </h4>
                    <div className="space-y-2">
                      {stats.lowStockProducts.slice(0, 4).map((product: any) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer" onClick={() => router.push(`/admin/inventory`)}>
                          <span className="text-white/80 font-medium text-sm truncate pr-4">{product.name}</span>
                          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
                            {product.stock} Left
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
