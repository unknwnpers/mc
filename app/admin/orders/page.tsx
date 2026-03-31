"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Filter, RefreshCw, Package } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-700 border-yellow-200",
  paid:            "bg-emerald-100 text-emerald-700 border-emerald-200",
  created:         "bg-neutral-100 text-neutral-600 border-neutral-200",
  processing:      "bg-amber-100 text-amber-600 border-amber-200",
  shipped:         "bg-blue-100 text-blue-600 border-blue-200",
  delivered:       "bg-green-100 text-green-600 border-green-200",
  cancelled:       "bg-red-100 text-red-600 border-red-200",
  failed:          "bg-red-200 text-red-700 border-red-300",
};

const ALL_STATUSES = ["all", "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const [orders, setOrders]               = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter]   = useState("all");
  const [fetching, setFetching]           = useState(true);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const { user, profile, loading }        = useAuth();

  // Derive auth from profile role (works both "admin" and "superadmin")
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  /** Fetch orders from the secure admin API */
  const fetchOrders = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/orders?limit=200", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data.orders || []);
      setFilteredOrders(data.orders || []);
    } catch (err: any) {
      toast.error(err.message || "Could not load orders");
    } finally {
      setFetching(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!loading && isAdmin) fetchOrders();
  }, [loading, isAdmin, fetchOrders]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(o => o.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(`Order status → ${status}`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Loading auth state ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-400 border-t-transparent" />
      </div>
    );
  }

  /* ── Access Denied ───────────────────────────────────────────────── */
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-neutral-100 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-neutral-900 mb-4">Access Denied</h1>
          <p className="text-neutral-500 mb-8">You do not have administrator permissions.</p>
          <a href="/" className="inline-block bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all">
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  /* ── Admin Dashboard ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg text-white">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-neutral-900">Admin Dashboard</h1>
              <p className="text-neutral-500 font-medium tracking-tight">Secure — orders fetched via API</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-neutral-100 gap-2">
              <div className="px-6 py-2 border-r border-neutral-100">
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-0.5">Total</p>
                <p className="text-2xl font-black text-neutral-900">{orders.length}</p>
              </div>
              <div className="px-6 py-2">
                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-0.5">Pending</p>
                <p className="text-2xl font-black text-rose-500">
                  {orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length}
                </p>
              </div>
            </div>
            <button
              onClick={fetchOrders}
              disabled={fetching}
              className="p-3 rounded-2xl bg-white border border-neutral-100 shadow-sm hover:bg-neutral-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5 text-neutral-500", fetching && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-neutral-400" />
            <span className="font-bold text-neutral-700">Filter:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize",
                  statusFilter === s
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-lg"
                    : "bg-white text-neutral-600 border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50"
                )}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl shadow-xl shadow-rose-100/10 border border-neutral-100 overflow-hidden text-black">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow className="hover:bg-transparent border-neutral-100">
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Order ID</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Customer / Items</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Total</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px] text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetching ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-rose-400 border-r-transparent" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3 text-neutral-400">
                      <Package className="w-10 h-10" />
                      <p className="font-semibold">No orders matching this filter</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id} className="border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <TableCell className="font-mono text-[11px] text-neutral-400 py-6 px-8">
                      {order.id.slice(0, 14)}…
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-tighter truncate max-w-[220px]">
                          {order.recipient?.name || order.userId}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(order.items || []).map((item: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] font-medium border-neutral-200 text-neutral-600 bg-white">
                              {item.name}
                              {item.selectedSize ? ` / ${item.selectedSize}` : ""} × {item.quantity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <span className="text-lg font-black text-neutral-900">₹{order.total}</span>
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <Badge className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        statusStyles[order.status] || statusStyles.created
                      )}>
                        {order.status?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-6 px-8 text-right">
                      <Select
                        defaultValue={order.status}
                        disabled={updatingId === order.id}
                        onValueChange={val => updateStatus(order.id, val)}
                      >
                        <SelectTrigger className="w-[150px] ml-auto rounded-xl border-neutral-200 font-bold text-xs shadow-sm bg-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-neutral-200">
                          {["created", "processing", "shipped", "delivered", "cancelled"].map(s => (
                            <SelectItem key={s} value={s} className="text-xs font-bold capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
