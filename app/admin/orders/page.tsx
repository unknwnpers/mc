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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Filter, 
  RefreshCw, 
  Package, 
  Search, 
  Calendar, 
  ArrowUpDown, 
  Download, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal, 
  Copy,
  ChevronDown
} from "lucide-react";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  pending_payment: { bg: "bg-orange-50",  text: "text-orange-600", dot: "bg-orange-400" },
  paid:            { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  created:         { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400" },
  processing:      { bg: "bg-sky-50",     text: "text-sky-600",     dot: "bg-sky-400" },
  shipped:         { bg: "bg-purple-50",  text: "text-purple-600",  dot: "bg-purple-400" },
  delivered:       { bg: "bg-green-50",   text: "text-green-600",   dot: "bg-green-400" },
  cancelled:       { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400" },
  failed:          { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-400" },
  expired:         { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400" },
};

const paymentMethodStyles = {
  cod: "bg-orange-100 text-orange-700 border-orange-200",
  online: "bg-blue-100 text-blue-700 border-blue-200",
  codToOnline: "bg-purple-100 text-purple-700 border-purple-200",
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

  // ── Access Denied ─────────────────────────────────────────────────
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

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Order ID copied");
  };

  /* ── Admin Dashboard ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-neutral-900 rounded-xl flex items-center justify-center shadow-lg text-white">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Orders</h1>
              <p className="text-neutral-400 font-medium tracking-tight text-sm">Secure — orders fetched via API</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 p-1.5 rounded-xl shadow-sm border border-white/10 gap-1.5">
              <div className="px-5 py-1.5 border-r border-white/10">
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-widest mb-0.5">Total</p>
                <p className="text-xl font-black text-white">{orders.length}</p>
              </div>
              <div className="px-5 py-1.5">
                <p className="text-[9px] uppercase font-bold text-neutral-500 tracking-widest mb-0.5">Pending</p>
                <p className="text-xl font-black text-rose-500">
                  {orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length}
                </p>
              </div>
            </div>
            <button
              onClick={exportOrders}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-900 shadow-sm hover:bg-neutral-100 transition-all text-sm font-bold"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={fetchOrders}
              disabled={fetching}
              className="p-2.5 rounded-xl bg-white text-neutral-900 shadow-sm hover:bg-neutral-100 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", fetching && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search & Filters Container */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 mb-8 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-neutral-100 bg-neutral-50/50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all"
            />
          </div>

          {/* Filter Row 1: Status Pills */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span className="text-sm font-bold text-neutral-600 whitespace-nowrap">Status:</span>
            <div className="flex items-center gap-1.5">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all border capitalize whitespace-nowrap",
                    statusFilter === s
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-lg shadow-neutral-200"
                      : "bg-white text-neutral-500 border-neutral-100 hover:border-neutral-200"
                  )}
                >
                  {s === "all" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Filter Row 2: Selects and Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-neutral-50">
            {/* Amount Range */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-neutral-600">Amount:</span>
              <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-100">
                <input
                  type="number"
                  placeholder="Min"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-transparent text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
                <span className="text-neutral-300">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-16 px-2 py-1.5 bg-transparent text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-3">
              <ArrowUpDown className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-bold text-neutral-600">Sort:</span>
              <div className="flex bg-neutral-50 p-1 rounded-xl border border-neutral-100 gap-1">
                <button
                  onClick={() => {
                    if (sortBy === "date") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortBy("date"); setSortOrder("desc"); }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    sortBy === "date" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
                <button
                  onClick={() => {
                    if (sortBy === "amount") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    else { setSortBy("amount"); setSortOrder("desc"); }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    sortBy === "amount" ? "bg-neutral-900 text-white shadow-md" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Amount {sortBy === "amount" && (sortOrder === "asc" ? "↑" : "↓")}
                </button>
              </div>
            </div>

            {/* Payment Dropdown */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-neutral-600">Payment:</span>
              <select
                value={paymentMethodFilter}
                onChange={e => setPaymentMethodFilter(e.target.value)}
                className="px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all appearance-none pr-10 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'currentColor\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                <option value="all">All Methods</option>
                <option value="cod">Cash on Delivery</option>
                <option value="online">Online Payment</option>
                <option value="codToOnline">COD → Online</option>
              </select>
            </div>

            {/* Date Dropdown */}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-bold text-neutral-600">Date:</span>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs font-bold text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all appearance-none pr-10 relative"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'currentColor\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(searchQuery || dateFilter !== "all" || minAmount || maxAmount || paymentMethodFilter !== "all") && (
              <button
                onClick={() => { setSearchQuery(""); setDateFilter("all"); setMinAmount(""); setMaxAmount(""); setPaymentMethodFilter("all"); }}
                className="ml-auto text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 overflow-hidden text-black mb-8">
          <Table>
            <TableHeader className="bg-neutral-50/50">
              <TableRow className="hover:bg-transparent border-neutral-100">
                <TableHead className="font-bold text-neutral-400 py-6 px-8 uppercase tracking-widest text-[10px]">Order ID</TableHead>
                <TableHead className="font-bold text-neutral-400 py-6 px-8 uppercase tracking-widest text-[10px]">Customer / Items</TableHead>
                <TableHead className="font-bold text-neutral-400 py-6 px-8 uppercase tracking-widest text-[10px]">Total</TableHead>
                <TableHead className="font-bold text-neutral-400 py-6 px-8 uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-bold text-neutral-400 py-6 px-8 uppercase tracking-widest text-[10px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetching ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-900 border-r-transparent" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3 text-neutral-400">
                      <Package className="w-10 h-10 stroke-[1.5]" />
                      <p className="font-bold text-sm tracking-tight">No orders matching this filter</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order: any) => (
                  <TableRow key={order.id} className="border-neutral-50 hover:bg-neutral-50/30 transition-colors group">
                    <TableCell className="py-8 px-8">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 group/id">
                          <span className="font-black text-neutral-900 text-sm tracking-tighter">#{order.id.slice(0, 10).toUpperCase()}</span>
                          <button 
                            onClick={() => copyToClipboard(order.id)}
                            className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 rounded-md hover:bg-neutral-100"
                          >
                            <Copy className="w-3 h-3 text-neutral-400" />
                          </button>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{formatDate(order.createdAt)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="py-8 px-8">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter shrink-0",
                          "bg-neutral-100 text-neutral-600"
                        )}>
                          {getInitials(order.recipient?.name)}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-black text-neutral-900 leading-none">
                            {order.recipient?.name || "Anonymous"}
                          </p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-[10px] font-medium text-neutral-400 truncate max-w-[150px]">{order.recipient?.email}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(order.items || []).slice(0, 2).map((item: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px] font-bold py-0 h-4 border-neutral-100 text-neutral-500 bg-neutral-50/50 px-1.5 whitespace-nowrap">
                                {item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name}
                              </Badge>
                            ))}
                            {(order.items || []).length > 2 && (
                              <span className="text-[9px] font-bold text-neutral-400 self-center">+{order.items.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-8 px-8">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-lg font-black text-neutral-900 leading-none tracking-tighter">₹{order.total.toLocaleString()}</span>
                        <Badge variant="outline" className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none w-fit",
                          order.isCOD ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {order.isCOD ? "COD" : "Online"}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="py-8 px-8">
                      <div className="flex flex-col gap-2">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border-none",
                          statusStyles[order.status]?.bg || "bg-neutral-50",
                          statusStyles[order.status]?.text || "text-neutral-500"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", statusStyles[order.status]?.dot || "bg-neutral-400")} />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {order.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
                          {formatDate(order.updatedAt || order.createdAt)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-8 px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-all border border-neutral-100 shadow-sm"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-neutral-600" />
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-all border border-neutral-100 shadow-sm">
                              <MoreHorizontal className="w-4 h-4 text-neutral-600" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 border-neutral-100 shadow-xl">
                            <p className="px-3 py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Update Status</p>
                            {["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"].map(s => (
                              <DropdownMenuItem 
                                key={s} 
                                onClick={() => updateStatus(order.id, s)}
                                className={cn(
                                  "rounded-xl text-xs font-bold capitalize py-2.5",
                                  order.status === s && "bg-neutral-100"
                                )}
                              >
                                {s.replace(/_/g, " ")}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-6 bg-neutral-50/50 border-t border-neutral-100 gap-4">
            <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  className="bg-white px-3 py-1.5 rounded-lg border border-neutral-200 text-[10px] font-bold text-neutral-700 focus:outline-none shadow-sm"
                >
                  {[10, 25, 50, 100].map(v => (
                    <option key={v} value={v}>{v} per page</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage > 3) pageNum = currentPage - 2 + i;
                      if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                    }
                    if (pageNum > totalPages || pageNum < 1) return null;
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "h-8 w-8 rounded-lg text-xs font-black transition-all shadow-sm",
                          currentPage === pageNum
                            ? "bg-neutral-900 text-white"
                            : "bg-white border border-neutral-200 text-neutral-400 hover:bg-neutral-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 w-8 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 transition-all flex items-center justify-center shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
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
