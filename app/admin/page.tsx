"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { TrendingUp, ShoppingBag, Package, Users, Clock, ArrowRight, ArrowUpRight } from "lucide-react";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGet("/api/admin/analytics")
      .then(d => setStats(d.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
  ];

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="text-white/30 text-sm mt-1">Your business at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
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
              <p className="text-2xl font-black text-white leading-none">{c.value}</p>
            )}
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-2">{c.label}</p>
          </button>
        ))}
      </div>

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
