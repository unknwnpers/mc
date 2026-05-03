"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useMemo } from "react";
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
import { LayoutDashboard, Filter, RefreshCw, Package, Search, Calendar, ArrowUpDown, Download, Eye, X, ChevronLeft, ChevronRight, Copy, CheckCheck } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity p-1 rounded hover:bg-neutral-100"
      title="Copy order ID"
    >
      {copied ? <CheckCheck className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
  const colors = ["bg-rose-100 text-rose-600","bg-blue-100 text-blue-600","bg-amber-100 text-amber-600","bg-violet-100 text-violet-600","bg-emerald-100 text-emerald-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0", color)}>
      {initials}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
  paid:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  created:         "bg-neutral-100 text-neutral-600 border-neutral-200",
  processing:      "bg-amber-50 text-amber-600 border-amber-200",
  shipped:         "bg-blue-50 text-blue-600 border-blue-200",
  delivered:       "bg-green-50 text-green-700 border-green-200",
  cancelled:       "bg-red-50 text-red-600 border-red-200",
  failed:          "bg-red-100 text-red-700 border-red-300",
  expired:         "bg-gray-100 text-gray-500 border-gray-200",
};

const statusDots: Record<string, string> = {
  pending_payment: "bg-yellow-400",
  paid:            "bg-emerald-500",
  created:         "bg-neutral-400",
  processing:      "bg-amber-500",
  shipped:         "bg-blue-500",
  delivered:       "bg-green-500",
  cancelled:       "bg-red-500",
  failed:          "bg-red-700",
  expired:         "bg-gray-400",
};

const paymentMethodStyles = {
  cod: "bg-orange-50 text-orange-700 border-orange-200",
  online: "bg-blue-50 text-blue-700 border-blue-200",
  codToOnline: "bg-purple-50 text-purple-700 border-purple-200",
};

// Helper function to safely format dates
function formatDate(dateValue: any): string {
  if (!dateValue) return "N/A";
  
  try {
    let date: Date;
    
    // Handle Firestore Timestamp
    if (dateValue.toDate && typeof dateValue.toDate === "function") {
      date = dateValue.toDate();
    } else if (typeof dateValue === "string" || typeof dateValue === "number") {
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (dateValue.seconds) {
      // Firestore timestamp object {seconds, nanoseconds}
      date = new Date(dateValue.seconds * 1000);
    } else {
      return "N/A";
    }
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      return "N/A";
    }
    
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

const ALL_STATUSES = ["all", "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"];

export default function AdminOrdersPage() {
  const [orders, setOrders]               = useState<any[]>([]);
  const [statusFilter, setStatusFilter]   = useState("all");
  const [fetching, setFetching]           = useState(true);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const { user, profile, loading }        = useAuth();

  // ── Search & Filter State ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState("");
  const [dateFilter, setDateFilter]       = useState<string>("all");
  const [minAmount, setMinAmount]         = useState<string>("");
  const [maxAmount, setMaxAmount]         = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [sortBy, setSortBy]               = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder]         = useState<"asc" | "desc">("desc");

  // ── Pagination State ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage]     = useState(1);
  const [itemsPerPage, setItemsPerPage]   = useState(10);

  // ── Order Details Modal State ─────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
    } catch (err: any) {
      toast.error(err.message || "Could not load orders");
    } finally {
      setFetching(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!loading && isAdmin) fetchOrders();
  }, [loading, isAdmin, fetchOrders]);

  // ── Filter & Sort Logic ───────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(o => o.status === statusFilter);
    }

    // Search filter (order ID, customer name, email, phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.recipient?.name?.toLowerCase().includes(query) ||
        o.recipient?.email?.toLowerCase().includes(query) ||
        o.recipient?.phone?.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        switch (dateFilter) {
          case "today":
            return orderDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Amount filter
    const min = parseFloat(minAmount) || 0;
    const max = parseFloat(maxAmount) || Infinity;
    if (min > 0 || max < Infinity) {
      result = result.filter(o => o.total >= min && o.total <= max);
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      result = result.filter(o => {
        if (paymentMethodFilter === "cod") return o.isCOD === true;
        if (paymentMethodFilter === "online") return o.isCOD !== true && !o.codPaymentRazorpayOrderId;
        if (paymentMethodFilter === "codToOnline") return !o.isCOD && !!o.codPaymentRazorpayOrderId;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case "amount":
          comparison = a.total - b.total;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [orders, statusFilter, searchQuery, dateFilter, minAmount, maxAmount, sortBy, sortOrder]);

  // ── Pagination Logic ──────────────────────────────────────────────────────
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFilter, minAmount, maxAmount, paymentMethodFilter]);

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

  // ── Export Orders ─────────────────────────────────────────────────────────
  function exportOrders() {
    const ordersToExport = filteredOrders.length > 0 ? filteredOrders : orders;
    
    const headers = ["Order ID", "Date", "Customer Name", "Email", "Phone", "Status", "Payment Method", "COD Fee", "Total", "Items Count"];
    const rows = ordersToExport.map(o => {
      let dateStr = "";
      try {
        if (o.createdAt?.toDate) {
          dateStr = o.createdAt.toDate().toISOString();
        } else if (o.createdAt) {
          const d = new Date(o.createdAt);
          if (!isNaN(d.getTime())) dateStr = d.toISOString();
        }
      } catch {
        dateStr = "";
      }
      
      return [
        o.id,
        dateStr,
        o.recipient?.name || "",
        o.recipient?.email || "",
        o.recipient?.phone || "",
        o.status,
        o.isCOD ? "COD" : (o.codPaymentRazorpayOrderId ? "COD→Online" : "Online"),
        (o.paymentBreakdown?.codCharge || 0).toString(),
        (o.total || 0).toString(),
        (o.items || []).length.toString()
      ];
    });
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${ordersToExport.length} orders`);
  }

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
              onClick={exportOrders}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-neutral-100 shadow-sm hover:bg-neutral-50 transition-all text-sm font-bold text-neutral-700"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={fetchOrders}
              disabled={fetching}
              className="p-3 rounded-2xl bg-white border border-neutral-100 shadow-sm hover:bg-neutral-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5 text-neutral-500", fetching && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-all"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-600">Status:</span>
              <div className="flex flex-wrap gap-1">
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-medium transition-all border capitalize",
                      statusFilter === s
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-6 bg-neutral-200" />

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-600">Date:</span>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="px-3 py-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:border-neutral-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            <div className="w-px h-6 bg-neutral-200" />

            {/* Amount Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-600">Amount:</span>
              <input
                type="number"
                placeholder="Min"
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:border-neutral-400"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                className="w-20 px-2 py-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div className="w-px h-6 bg-neutral-200" />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-600">Sort:</span>
              <button
                onClick={() => {
                  if (sortBy === "date") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("date");
                    setSortOrder("desc");
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                  sortBy === "date"
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                )}
              >
                Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
              <button
                onClick={() => {
                  if (sortBy === "amount") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("amount");
                    setSortOrder("desc");
                  }
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                  sortBy === "amount"
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                )}
              >
                Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>
            </div>

            <div className="w-px h-6 bg-neutral-200" />

            {/* Payment Method Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-600">Payment:</span>
              <select
                value={paymentMethodFilter}
                onChange={e => setPaymentMethodFilter(e.target.value)}
                className="px-3 py-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:border-neutral-400"
              >
                <option value="all">All Methods</option>
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Payment</option>
                <option value="codToOnline">COD → Online</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || dateFilter !== "all" || minAmount || maxAmount || paymentMethodFilter !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setDateFilter("all"); setMinAmount(""); setMaxAmount(""); setPaymentMethodFilter("all"); }}
                className="ml-auto text-sm text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
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
                <TableHead className="font-bold text-neutral-800 py-6 px-8 uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
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
                paginatedOrders.map((order: any) => {
                  const customerName = order.recipient?.name || order.userName || "Customer";
                  const itemCount = (order.items || []).length;
                  const statusKey = order.status || "created";
                  const paymentLabel = order.isCOD ? "COD" : order.codPaymentRazorpayOrderId ? "COD→Online" : "Online";
                  const paymentStyle = order.isCOD ? paymentMethodStyles.cod : order.codPaymentRazorpayOrderId ? paymentMethodStyles.codToOnline : paymentMethodStyles.online;
                  return (
                    <TableRow key={order.id} className="group/row border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      {/* ORDER ID */}
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center">
                          <div>
                            <p className="font-mono text-xs font-bold text-neutral-800">#ORD-{order.id.slice(-6).toUpperCase()}</p>
                            <p className="text-[11px] text-neutral-400 mt-0.5">{formatDate(order.createdAt)}</p>
                          </div>
                          <CopyButton text={order.id} />
                        </div>
                      </TableCell>
                      {/* CUSTOMER */}
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar name={customerName} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{customerName}</p>
                            <p className="text-[11px] text-neutral-400 truncate">{order.recipient?.email || ""}</p>
                            {order.recipient?.phone && <p className="text-[11px] text-neutral-400">+{order.recipient.phone}</p>}
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                              className="mt-1 text-[10px] text-neutral-400 hover:text-rose-500 font-medium transition-colors"
                            >
                              {itemCount} {itemCount === 1 ? "item" : "items"} ›
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      {/* TOTAL */}
                      <TableCell className="py-5 px-6">
                        <p className="text-base font-black text-neutral-900">₹{(order.total || 0).toLocaleString("en-IN")}</p>
                        <Badge className={cn("mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border w-fit", paymentStyle)}>
                          {paymentLabel}
                        </Badge>
                      </TableCell>
                      {/* STATUS */}
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", statusDots[statusKey] || "bg-neutral-300")} />
                          <div>
                            <Badge className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                              statusStyles[statusKey] || statusStyles.created
                            )}>
                              {statusKey.replace(/_/g, " ")}
                            </Badge>
                            {order.updatedAt && <p className="text-[10px] text-neutral-400 mt-1">{formatDate(order.updatedAt)}</p>}
                          </div>
                        </div>
                      </TableCell>
                      {/* ACTIONS */}
                      <TableCell className="py-5 px-6 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-all"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-neutral-500" />
                          </button>
                          <Select
                            defaultValue={order.status}
                            disabled={updatingId === order.id}
                            onValueChange={val => updateStatus(order.id, val)}
                          >
                            <SelectTrigger className="w-[120px] rounded-xl border-neutral-200 font-semibold text-xs bg-white">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-neutral-200">
                              {["created","processing","shipped","delivered","cancelled"].map(s => (
                                <SelectItem key={s} value={s} className="text-xs font-semibold capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-8 py-6 border-t border-neutral-100">
              <div className="flex items-center gap-4">
                <p className="text-neutral-500 text-sm">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-neutral-200 text-sm text-neutral-700 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-9 px-3 rounded-lg border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) pageNum = currentPage - 2 + i;
                      if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum > totalPages) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "h-9 w-9 rounded-lg text-sm font-medium transition-all",
                          currentPage === pageNum
                            ? "bg-neutral-900 text-white"
                            : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 px-3 rounded-lg border border-neutral-200 text-neutral-600 text-sm hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Order Details Modal ──────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-100">
              <div>
                <h2 className="text-xl font-black text-neutral-900">Order Details</h2>
                <p className="text-neutral-500 text-sm font-mono mt-1">{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-all"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-8 space-y-8">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <Badge className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                    statusStyles[selectedOrder.status] || statusStyles.created
                  )}>
                    {selectedOrder.status?.replace("_", " ")}
                  </Badge>
                  <span className="text-neutral-500 text-sm">
                    {formatDate(selectedOrder.createdAt)}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="bg-neutral-50 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Customer</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">Name</p>
                      <p className="font-bold text-neutral-900">{selectedOrder.recipient?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <p className="font-bold text-neutral-900">{selectedOrder.recipient?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Phone</p>
                      <p className="font-bold text-neutral-900">{selectedOrder.recipient?.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">User ID</p>
                      <p className="font-mono text-xs text-neutral-600">{selectedOrder.userId}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-neutral-50 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Shipping Address</h3>
                  {selectedOrder.recipient?.address ? (
                    <div className="text-neutral-900">
                      <p className="font-bold">{selectedOrder.recipient.address.name}</p>
                      <p>{selectedOrder.recipient.address.addressLine1}</p>
                      {selectedOrder.recipient.address.addressLine2 && <p>{selectedOrder.recipient.address.addressLine2}</p>}
                      {selectedOrder.recipient.address.landmark && <p className="text-neutral-500 text-sm">Landmark: {selectedOrder.recipient.address.landmark}</p>}
                      <p>{selectedOrder.recipient.address.city}, {selectedOrder.recipient.address.state} - {selectedOrder.recipient.address.pincode}</p>
                      <p className="text-neutral-500 text-sm mt-1">Phone: {selectedOrder.recipient.address.phone}</p>
                    </div>
                  ) : (
                    <p className="text-neutral-500">No address information available</p>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {(selectedOrder.items || []).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                        <div className="flex items-center gap-4">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover bg-neutral-100" />
                          )}
                          <div>
                            <p className="font-bold text-neutral-900">{item.name}</p>
                            <p className="text-sm text-neutral-500">
                              Size: {item.selectedSize || "N/A"} × {item.quantity}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-neutral-900">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-neutral-50 rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Payment</h3>
                  
                  {/* Payment Method Badge */}
                  <div className="mb-4">
                    {selectedOrder.isCOD ? (
                      <Badge className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border", paymentMethodStyles.cod)}>
                        Cash on Delivery
                      </Badge>
                    ) : selectedOrder.codPaymentRazorpayOrderId ? (
                      <div className="space-y-1">
                        <Badge className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border", paymentMethodStyles.codToOnline)}>
                          Paid Online (converted from COD)
                        </Badge>
                        {selectedOrder.razorpayPaymentId && (
                          <p className="text-[10px] text-purple-600 font-mono">Payment ID: {selectedOrder.razorpayPaymentId}</p>
                        )}
                      </div>
                    ) : (
                      <Badge className={cn("px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border", paymentMethodStyles.online)}>
                        Paid Online (Razorpay)
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Subtotal</span>
                      <span className="font-medium">₹{selectedOrder.subtotal || selectedOrder.total}</span>
                    </div>
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-₹{selectedOrder.discount}</span>
                      </div>
                    )}
                    
                    {/* Payment Breakdown */}
                    {selectedOrder.paymentBreakdown && (
                      <>
                        {selectedOrder.paymentBreakdown.shipping > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Shipping</span>
                            <span className="font-medium">₹{selectedOrder.paymentBreakdown.shipping}</span>
                          </div>
                        )}
                        {selectedOrder.paymentBreakdown.handlingFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Handling Fee</span>
                            <span className="font-medium">₹{selectedOrder.paymentBreakdown.handlingFee}</span>
                          </div>
                        )}
                        {selectedOrder.paymentBreakdown.gst?.total > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">GST (5%)</span>
                            <span className="font-medium">₹{selectedOrder.paymentBreakdown.gst.total}</span>
                          </div>
                        )}
                        {selectedOrder.paymentBreakdown.codCharge > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>COD Fee</span>
                            <span className="font-medium">₹{selectedOrder.paymentBreakdown.codCharge}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {!selectedOrder.paymentBreakdown && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Shipping</span>
                        <span className="font-medium">{selectedOrder.shipping > 0 ? `₹${selectedOrder.shipping}` : "Free"}</span>
                      </div>
                    )}

                    <div className="border-t border-neutral-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-neutral-900">Total</span>
                        <span className="font-black text-xl text-neutral-900">₹{selectedOrder.total}</span>
                      </div>
                    </div>
                    
                    {/* Payment Status for COD */}
                    {selectedOrder.isCOD && (
                      <div className="pt-2 text-sm">
                        <p className="text-orange-600 font-medium">
                          Payment pending - Collect ₹{selectedOrder.total} on delivery
                        </p>
                        {selectedOrder.codPaymentRazorpayOrderId && (
                          <p className="text-amber-600 text-xs mt-1">
                            Online payment initiated but not completed
                          </p>
                        )}
                      </div>
                    )}

                    {/* Converted from COD - show payment confirmation */}
                    {!selectedOrder.isCOD && selectedOrder.codPaymentRazorpayOrderId && selectedOrder.razorpayPaymentId && (
                      <div className="pt-2 text-sm">
                        <p className="text-purple-600 font-medium">
                          Customer paid online — no cash collection needed
                        </p>
                      </div>
                    )}

                    {selectedOrder.razorpayOrderId && !selectedOrder.isCOD && !selectedOrder.codPaymentRazorpayOrderId && (
                      <div className="pt-2 text-sm text-neutral-500">
                        <p>Payment ID: {selectedOrder.razorpayOrderId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    {/* Build timeline from the order.timeline array (same as customer page) */}
                    {selectedOrder.timeline && Array.isArray(selectedOrder.timeline) && selectedOrder.timeline.length > 0 ? (
                      selectedOrder.timeline.map((entry: any, i: number) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className={cn(
                            "w-3 h-3 rounded-full mt-1.5",
                            "bg-green-500",
                            i === selectedOrder.timeline.length - 1 && "ring-4 ring-green-100"
                          )} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-neutral-900 capitalize">
                                {entry.status?.replace(/_/g, " ")}
                              </p>
                              {entry.by && entry.by !== "system" && (
                                <span className="text-[10px] text-neutral-400">by {entry.by === selectedOrder.userId ? "customer" : entry.by}</span>
                              )}
                            </div>
                            {entry.note && (
                              <p className="text-sm text-neutral-500">{entry.note}</p>
                            )}
                            {entry.time && (
                              <p className="text-xs text-neutral-400">{formatDate(entry.time)}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      /* Fallback: basic timeline from status fields */
                      [
                        { status: "created", label: "Order Placed", time: selectedOrder.createdAt },
                        { status: "processing", label: "Processing", time: selectedOrder.processedAt },
                        { status: "shipped", label: "Shipped", time: selectedOrder.shippedAt },
                        { status: "delivered", label: "Delivered", time: selectedOrder.deliveredAt },
                      ].map((step, i) => {
                        const statusOrder = ["created", "processing", "shipped", "delivered"];
                        const isCompleted = statusOrder.indexOf(selectedOrder.status) >= statusOrder.indexOf(step.status);
                        const isCurrent = selectedOrder.status === step.status;
                        return (
                          <div key={step.status} className="flex items-start gap-4">
                            <div className={cn(
                              "w-3 h-3 rounded-full mt-1.5",
                              isCompleted ? "bg-green-500" : "bg-neutral-200",
                              isCurrent && "ring-4 ring-green-100"
                            )} />
                            <div className="flex-1">
                              <p className={cn(
                                "font-bold",
                                isCompleted ? "text-neutral-900" : "text-neutral-400"
                              )}>
                                {step.label}
                              </p>
                              {step.time && (
                                <p className="text-sm text-neutral-500">
                                  {formatDate(step.time)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
