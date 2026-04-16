"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Users, TrendingUp, Package, Target, 
  Calendar, ArrowUpRight, ArrowDownRight, Minus,
  BarChart3, PieChart, LineChart
} from "lucide-react";

async function adminGet(url: string) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

// ============================================================================
// CUSTOMER SEGMENTS VISUALIZATION
// ============================================================================
function SegmentsView({ data }: { data: any }) {
  if (!data?.segments) return <div className="text-neutral-500">No data</div>;

  const segments = data.segments;
  const total = data.totalCustomers || 1;

  const colors: Record<string, string> = {
    champions: "bg-emerald-500",
    loyal: "bg-blue-500",
    potential: "bg-amber-500",
    new: "bg-purple-500",
    atRisk: "bg-orange-500",
    lost: "bg-red-500",
  };

  const labels: Record<string, string> = {
    champions: "Champions",
    loyal: "Loyal Customers",
    potential: "Potential Loyalists",
    new: "New Customers",
    atRisk: "At Risk",
    lost: "Lost",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(segments).map(([key, value]: [string, any]) => (
          <Card key={key} className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${colors[key]}`} />
                <span className="text-sm text-neutral-400">{labels[key]}</span>
              </div>
              <div className="text-2xl font-bold text-white">{value.count}</div>
              <div className="text-sm text-neutral-500">
                {((value.count / total) * 100).toFixed(1)}% • Avg ₹{Math.round(value.avgValue || 0)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Simple bar chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Customer Distribution</h3>
        <div className="space-y-3">
          {Object.entries(segments).map(([key, value]: [string, any]) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-32 text-sm text-neutral-400">{labels[key]}</div>
              <div className="flex-1 h-8 bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${colors[key]} transition-all duration-500`}
                  style={{ width: `${(value.count / total) * 100}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm text-white">{value.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SALES FORECAST VISUALIZATION
// ============================================================================
function ForecastView({ data }: { data: any }) {
  if (!data?.forecast) return <div className="text-neutral-500">No data</div>;

  const { historical, forecast, trend, trendPercentage } = data;
  
  const maxValue = Math.max(
    ...historical.map((h: any) => h.revenue),
    ...forecast.map((f: any) => f.projectedRevenue)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Card className="bg-neutral-900 border-neutral-800 flex-1">
          <CardContent className="p-4">
            <div className="text-sm text-neutral-400">Trend</div>
            <div className={`flex items-center gap-2 text-2xl font-bold ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-neutral-400'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-6 h-6" /> : 
               trend === 'down' ? <ArrowDownRight className="w-6 h-6" /> : 
               <Minus className="w-6 h-6" />}
              {Math.abs(trendPercentage).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-neutral-900 border-neutral-800 flex-1">
          <CardContent className="p-4">
            <div className="text-sm text-neutral-400">Next Week Projection</div>
            <div className="text-2xl font-bold text-white">
              ₹{Math.round(forecast[0]?.projectedRevenue || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Forecast</h3>
        <div className="h-64 flex items-end gap-1">
          {/* Historical */}
          {historical.slice(-12).map((h: any, i: number) => (
            <div key={`hist-${i}`} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-blue-500/60 rounded-t"
                style={{ height: `${(h.revenue / maxValue) * 200}px` }}
              />
              <span className="text-xs text-neutral-500 rotate-45 origin-left">{h.week.slice(-2)}w</span>
            </div>
          ))}
          {/* Forecast */}
          {forecast.map((f: any, i: number) => (
            <div key={`fore-${i}`} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-emerald-500/60 rounded-t border-2 border-dashed border-emerald-400"
                style={{ height: `${(f.projectedRevenue / maxValue) * 200}px` }}
              />
              <span className="text-xs text-emerald-400">{f.week}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500/60 rounded" />
            <span className="text-sm text-neutral-400">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500/60 rounded border-2 border-dashed border-emerald-400" />
            <span className="text-sm text-neutral-400">Forecast</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COHORT ANALYSIS VISUALIZATION
// ============================================================================
function CohortsView({ data }: { data: any }) {
  if (!data?.cohorts) return <div className="text-neutral-500">No data</div>;

  const cohorts = data.cohorts.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Cohort Analysis (Customer Retention)</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-neutral-400">
              <th className="pb-3">Cohort</th>
              <th className="pb-3">Customers</th>
              <th className="pb-3">Revenue</th>
              <th className="pb-3">Avg/Customer</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c: any) => (
              <tr key={c.signupMonth} className="border-t border-neutral-800">
                <td className="py-3 text-white font-medium">{c.signupMonth}</td>
                <td className="py-3 text-neutral-300">{c.customers}</td>
                <td className="py-3 text-neutral-300">₹{c.totalRevenue.toLocaleString()}</td>
                <td className="py-3 text-emerald-400">₹{Math.round(c.avgRevenuePerCustomer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// PRODUCT ANALYTICS VISUALIZATION
// ============================================================================
function ProductsView({ data }: { data: any }) {
  if (!data?.topSelling) return <div className="text-neutral-500">No data</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.topSelling.slice(0, 5).map((p: any, i: number) => (
            <div key={p.productId} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 text-sm flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white truncate">{p.name}</div>
                <div className="text-sm text-neutral-500">{p.unitsSold} units sold</div>
              </div>
              <div className="text-emerald-400">₹{p.revenue.toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Low Conversion (High Views, No Sales)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.lowConversion?.slice(0, 5).map((p: any) => (
            <div key={p.productId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white truncate">{p.name}</div>
                <div className="text-sm text-neutral-500">{p.views} views • {p.stock} in stock</div>
              </div>
              <div className="text-amber-400 text-sm">No sales</div>
            </div>
          )) || <div className="text-neutral-500">All products converting well</div>}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-white text-lg">Inventory Turnover Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.inventoryTurnover?.slice(0, 5).map((p: any) => (
              <div key={p.productId} className="flex items-center gap-4">
                <div className="w-48 truncate text-white">{p.name}</div>
                <div className="flex-1 h-4 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      p.turnoverRate > 2 ? 'bg-emerald-500' : 
                      p.turnoverRate > 1 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(p.turnoverRate * 20, 100)}%` }}
                  />
                </div>
                <div className="w-16 text-right text-neutral-400">{p.turnoverRate.toFixed(1)}x</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("segments");

  useEffect(() => {
    adminGet("/api/admin/analytics/advanced?type=all")
      .then(d => setData(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-800 rounded w-64" />
            <div className="h-64 bg-neutral-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Advanced Analytics</h1>
            <p className="text-neutral-400 mt-1">Deep insights into customer behavior and business performance</p>
          </div>
          <Button 
            variant="outline" 
            className="border-neutral-700 text-neutral-300"
            onClick={() => window.open(`/api/admin/analytics/advanced?type=all`, '_blank')}
          >
            Export JSON
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="segments" className="data-[state=active]:bg-neutral-800">
              <Users className="w-4 h-4 mr-2" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-neutral-800">
              <TrendingUp className="w-4 h-4 mr-2" />
              Forecast
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="data-[state=active]:bg-neutral-800">
              <Calendar className="w-4 h-4 mr-2" />
              Cohorts
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-neutral-800">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
          </TabsList>

          <TabsContent value="segments" className="mt-6">
            <SegmentsView data={data?.segments} />
          </TabsContent>

          <TabsContent value="forecast" className="mt-6">
            <ForecastView data={data?.forecast} />
          </TabsContent>

          <TabsContent value="cohorts" className="mt-6">
            <CohortsView data={data?.cohorts} />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductsView data={data?.products} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
