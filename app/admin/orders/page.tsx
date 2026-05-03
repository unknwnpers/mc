"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Header } from "@/components/admin/orders/Header";
import { FiltersBar } from "@/components/admin/orders/FiltersBar";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { Pagination } from "@/components/admin/orders/Pagination";
import { OrderDetailsModal } from "@/components/admin/orders/OrderDetailsModal";

export default function AdminOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // ── Filters State (Synchronized with URL) ──────────────────────────────────
  const filters = useMemo(() => ({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    dateRange: searchParams.get("dateRange") || "all",
    minAmount: searchParams.get("minAmount") || "",
    maxAmount: searchParams.get("maxAmount") || "",
    paymentMethod: searchParams.get("paymentMethod") || "all",
    sortBy: (searchParams.get("sortBy") as "date" | "amount") || "date",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "10"),
  }), [searchParams]);

  const setFilters = (newFilters: any) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  /** Fetch orders */
  const fetchOrders = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      // We fetch a larger batch for client-side filtering/searching in this simplified version, 
      // but the UI is built to handle server-side pagination in the future.
      const res = await fetch("/api/admin/orders?limit=500", {
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

    if (filters.status !== "all") {
      result = result.filter(o => o.status === filters.status);
    }

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.recipient?.name?.toLowerCase().includes(query) ||
        o.recipient?.email?.toLowerCase().includes(query) ||
        o.recipient?.phone?.toLowerCase().includes(query)
      );
    }

    if (filters.dateRange !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(o => {
        const orderDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        switch (filters.dateRange) {
          case "today": return orderDate >= today;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return orderDate >= monthAgo;
          default: return true;
        }
      });
    }

    const min = parseFloat(filters.minAmount) || 0;
    const max = parseFloat(filters.maxAmount) || Infinity;
    if (min > 0 || max < Infinity) {
      result = result.filter(o => o.total >= min && o.total <= max);
    }

    if (filters.paymentMethod !== "all") {
      result = result.filter(o => {
        if (filters.paymentMethod === "cod") return o.isCOD === true;
        if (filters.paymentMethod === "online") return o.isCOD !== true && !o.codPaymentRazorpayOrderId;
        if (filters.paymentMethod === "codToOnline") return !o.isCOD && !!o.codPaymentRazorpayOrderId;
        return true;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "date":
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          comparison = aDate.getTime() - bDate.getTime();
          break;
        case "amount":
          comparison = a.total - b.total;
          break;
      }
      return filters.sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [orders, filters]);

  // ── Pagination Logic ──────────────────────────────────────────────────────
  const paginatedOrders = useMemo(() => {
    const startIndex = (filters.page - 1) * filters.limit;
    return filteredOrders.slice(startIndex, startIndex + filters.limit);
  }, [filteredOrders, filters.page, filters.limit]);

  const totalPages = Math.ceil(filteredOrders.length / filters.limit);

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

  const exportOrders = () => {
    const headers = ["Order ID", "Date", "Customer", "Email", "Total", "Status"];
    const rows = filteredOrders.map(o => [
      o.id, 
      new Date(o.createdAt?.toDate?.() || o.createdAt).toISOString(),
      o.recipient?.name || "",
      o.recipient?.email || "",
      o.total,
      o.status
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Export started");
  };

  if (loading) return null; // Handled by layout

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <Header 
          totalOrders={orders.length}
          pendingOrders={orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length}
          onExport={exportOrders}
          onRefresh={fetchOrders}
          isRefreshing={fetching}
        />

        <FiltersBar 
          filters={filters}
          setFilters={setFilters}
          onClear={() => router.push(pathname)}
        />

        <OrdersTable 
          orders={paginatedOrders}
          fetching={fetching}
          onViewDetails={setSelectedOrder}
          onUpdateStatus={updateStatus}
          updatingId={updatingId}
        />

        <Pagination 
          currentPage={filters.page}
          totalPages={totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
          itemsPerPage={filters.limit}
          setItemsPerPage={(limit) => setFilters({ ...filters, limit, page: 1 })}
          totalItems={filteredOrders.length}
        />

        <OrderDetailsModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      </div>
    </div>
  );
}
