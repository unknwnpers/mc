"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Tag, Plus, Edit, Trash2, ToggleLeft, ToggleRight, AlertCircle, Search, Filter, X, Download, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export default function CouponsManagementPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: 10,
    minOrder: 0,
    maxDiscount: undefined as number | undefined,
    usageLimit: 100,
    expiresAt: "",
    active: true,
  });

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [usageFilter, setUsageFilter] = useState<'all' | 'low' | 'high' | 'exhausted'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting states
  const [sortBy, setSortBy] = useState<'code' | 'value' | 'usage' | 'expiresAt' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk operations states
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{ action: 'activate' | 'deactivate' | 'delete'; count: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user && profile?.role !== "superadmin") {
      router.push("/admin");
      toast.error("Superadmin access required");
      return;
    }

    if (user) {
      fetchCoupons();
    }
  }, [user, loading, profile, router]);

  async function fetchCoupons() {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCoupons(data.coupons || []);
      } else {
        toast.error(data.error || "Failed to fetch coupons");
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Coupon ${formData.code} created successfully`);
        setCreateDialogOpen(false);
        resetForm();
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to create coupon");
      }
    } catch (error) {
      console.error("Create coupon error:", error);
      toast.error("Failed to create coupon");
    }
  }

  async function handleUpdate() {
    if (!editingCoupon) return;

    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch("/api/admin/coupons/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: editingCoupon.code,
          updates: {
            active: editingCoupon.active,
            usageLimit: editingCoupon.usageLimit,
            maxDiscount: editingCoupon.maxDiscount,
            expiresAt: editingCoupon.expiresAt,
          },
        }),
      });

      // Safe JSON parsing
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Invalid response from server:", parseError);
        throw new Error("Server returned invalid response");
      }

      if (res.ok && data.success) {
        toast.success("Coupon updated successfully");
        setEditingCoupon(null);
        fetchCoupons();
      } else {
        toast.error(data?.error || "Failed to update coupon");
      }
    } catch (error) {
      console.error("Update coupon error:", error);
      toast.error("Failed to update coupon");
    }
  }

  async function toggleActive(coupon: Coupon) {
    setEditingCoupon({ ...coupon, active: !coupon.active });
    
    // Optimistic update
    setCoupons(prev => prev.map(c => 
      c.id === coupon.id ? { ...c, active: !c.active } : c
    ));
  }

  function resetForm() {
    setFormData({
      code: "",
      type: "percentage",
      value: 10,
      minOrder: 0,
      maxDiscount: undefined,
      usageLimit: 100,
      expiresAt: "",
      active: true,
    });
  }

  function openEditDialog(coupon: Coupon) {
    setEditingCoupon(coupon);
  }

  function formatDate(dateString: any): string {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return "Invalid date";
    }
  }

  function getTypeBadge(type: string) {
    return (
      <Badge variant="outline" className={
        type === "percentage" 
          ? "bg-blue-50 text-blue-700 border-blue-200" 
          : "bg-purple-50 text-purple-700 border-purple-200"
      }>
        {type === "percentage" ? "%" : "₹"} {type}
      </Badge>
    );
  }

  function getUsageProgress(usedCount: number, usageLimit: number) {
    const percentage = Math.round((usedCount / usageLimit) * 100);
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{usedCount} / {usageLimit}</span>
          <span className={`${percentage > 80 ? 'text-red-600' : 'text-gray-600'}`}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              percentage > 80 ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  // Filter and sort coupons
  const filteredCoupons = useMemo(() => {
    let result = coupons.filter(coupon => {
      // Search by code
      const matchesSearch = searchTerm === '' || 
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const now = new Date();
        const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < now : false;
        
        switch (statusFilter) {
          case 'active':
            matchesStatus = coupon.active && !isExpired;
            break;
          case 'inactive':
            matchesStatus = !coupon.active;
            break;
          case 'expired':
            matchesStatus = isExpired;
            break;
        }
      }

      // Type filter
      const matchesType = typeFilter === 'all' || coupon.type === typeFilter;

      // Usage filter
      let matchesUsage = true;
      if (usageFilter !== 'all') {
        const usagePercentage = (coupon.usedCount / coupon.usageLimit) * 100;
        switch (usageFilter) {
          case 'low':
            matchesUsage = usagePercentage < 25;
            break;
          case 'high':
            matchesUsage = usagePercentage >= 75 && usagePercentage < 100;
            break;
          case 'exhausted':
            matchesUsage = coupon.usedCount >= coupon.usageLimit;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesUsage;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'usage':
          const aUsage = a.usedCount / a.usageLimit;
          const bUsage = b.usedCount / b.usageLimit;
          comparison = aUsage - bUsage;
          break;
        case 'expiresAt':
          const aExp = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
          const bExp = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
          comparison = aExp - bExp;
          break;
        case 'created':
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [coupons, searchTerm, statusFilter, typeFilter, usageFilter, sortBy, sortOrder]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || usageFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setUsageFilter('all');
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCoupons.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, usageFilter, sortBy, sortOrder]);

  // ── Bulk Operations ───────────────────────────────────────────────────────
  function toggleCouponSelection(code: string) {
    setSelectedCoupons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) newSet.delete(code);
      else newSet.add(code);
      return newSet;
    });
  }

  function selectAllCoupons() {
    if (selectedCoupons.size === paginatedCoupons.length) {
      setSelectedCoupons(new Set());
    } else {
      setSelectedCoupons(new Set(paginatedCoupons.map(c => c.code)));
    }
  }

  async function executeBulkAction(action: 'activate' | 'deactivate' | 'delete') {
    if (selectedCoupons.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const selectedCodes = Array.from(selectedCoupons);
      
      if (action === 'delete') {
        // Delete coupons one by one using code
        for (const code of selectedCodes) {
          await fetch(`/api/admin/coupons/${code}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        }
        toast.success(`Deleted ${selectedCodes.length} coupon${selectedCodes.length !== 1 ? 's' : ''}`);
      } else {
        // Activate/deactivate via update API
        for (const code of selectedCodes) {
          await fetch("/api/admin/coupons/update", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ code, updates: { active: action === 'activate' } }),
          });
        }
        toast.success(`${action === 'activate' ? 'Activated' : 'Deactivated'} ${selectedCodes.length} coupon${selectedCodes.length !== 1 ? 's' : ''}`);
      }
      
      setSelectedCoupons(new Set());
      fetchCoupons();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirm(null);
    }
  }

  // Duplicate a coupon
  async function duplicateCoupon(coupon: Coupon) {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const payload = {
        code: `${coupon.code}-COPY`,
        type: coupon.type,
        value: coupon.value,
        minOrder: coupon.minOrder,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        expiresAt: "",
        active: false, // Start as inactive
      };

      const res = await fetch("/api/admin/coupons/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Coupon duplicated successfully');
        fetchCoupons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data.error || 'Failed to duplicate coupon');
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate coupon');
    }
  }

  // Export coupons to CSV
  function exportCoupons() {
    const couponsToExport = filteredCoupons.length > 0 ? filteredCoupons : coupons;
    const headers = ["Code", "Type", "Value", "Min Order", "Max Discount", "Usage Limit", "Used Count", "Status", "Expires At"];
    const rows = couponsToExport.map(c => [
      c.code,
      c.type,
      c.value.toString(),
      c.minOrder.toString(),
      c.maxDiscount?.toString() || "",
      c.usageLimit.toString(),
      c.usedCount.toString(),
      c.active ? "Active" : "Inactive",
      c.expiresAt ? formatDate(c.expiresAt) : "Never"
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${couponsToExport.length} coupons`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Tag className="w-12 h-12 mx-auto mb-4 animate-spin text-blush" />
          <p className="text-gray-600">Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-8 h-8 text-blush" />
            <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
          </div>
          <p className="text-gray-600">
            Create and manage discount codes
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCoupons}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
            className="bg-blush hover:bg-[#f48c82] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Coupon
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search coupons by code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters || hasActiveFilters ? "border-blush text-blush" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-2 bg-blush text-white">
                {[statusFilter, typeFilter, usageFilter].filter(f => f !== 'all').length + (searchTerm ? 1 : 0)}
              </Badge>
            )}
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            {/* Usage Filter */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Usage</label>
              <select
                value={usageFilter}
                onChange={(e) => setUsageFilter(e.target.value as typeof usageFilter)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Usage</option>
                <option value="low">Low (&lt;25%)</option>
                <option value="high">High (75-99%)</option>
                <option value="exhausted">Exhausted (100%)</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Sort By</label>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="created">Created Date</option>
                  <option value="code">Code</option>
                  <option value="value">Value</option>
                  <option value="usage">Usage %</option>
                  <option value="expiresAt">Expiration</option>
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 w-10"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            Showing {filteredCoupons.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredCoupons.length)} of {filteredCoupons.length} coupons
            {filteredCoupons.length !== coupons.length && ' (filtered)'}
          </p>
          
          {/* Items per page selector */}
          {filteredCoupons.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedCoupons.size > 0 && (
        <div className="mb-6 bg-blush/10 border border-blush/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-blush" />
            <span className="font-medium text-blush">
              {selectedCoupons.size} coupon{selectedCoupons.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirm({ action: 'activate', count: selectedCoupons.size })}
              disabled={bulkActionLoading}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirm({ action: 'deactivate', count: selectedCoupons.size })}
              disabled={bulkActionLoading}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkConfirm({ action: 'delete', count: selectedCoupons.size })}
              disabled={bulkActionLoading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Delete
            </Button>
            <div className="w-px h-6 bg-blush/30 mx-1" />
            <Button variant="ghost" size="sm" onClick={() => setSelectedCoupons(new Set())} className="text-blush">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Coupons
            </CardTitle>
            <Tag className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {coupons.filter(c => c.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Usage
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.reduce((sum, c) => sum + c.usedCount, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Redemptions across all coupons</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Discount Given
            </CardTitle>
            <Tag className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{coupons.reduce((sum, c) => {
              // Rough estimate based on usage
              return sum + (c.type === "fixed" ? c.value * c.usedCount : 0);
            }, 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Fixed discounts only</p>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={paginatedCoupons.length > 0 && paginatedCoupons.every(c => selectedCoupons.has(c.code))}
                    onChange={selectAllCoupons}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCoupons.map((coupon) => (
                <TableRow key={coupon.code} className={selectedCoupons.has(coupon.code) ? "bg-blush/5" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedCoupons.has(coupon.code)}
                      onChange={() => toggleCouponSelection(coupon.code)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-bold">{coupon.code}</TableCell>
                  <TableCell>{getTypeBadge(coupon.type)}</TableCell>
                  <TableCell>
                    {coupon.type === "percentage" 
                      ? `${coupon.value}%` 
                      : `₹${coupon.value}`}
                    {coupon.maxDiscount && (
                      <div className="text-xs text-gray-500">
                        Max: ₹{coupon.maxDiscount}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {coupon.minOrder > 0 ? `₹${coupon.minOrder}` : "None"}
                  </TableCell>
                  <TableCell className="w-48">
                    {getUsageProgress(coupon.usedCount, coupon.usageLimit)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(coupon.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      coupon.active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }>
                      {coupon.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className="hover:opacity-70 transition-opacity"
                        title={coupon.active ? "Deactivate" : "Activate"}
                      >
                        {coupon.active ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => duplicateCoupon(coupon)}
                        className="hover:opacity-70 transition-opacity text-gray-600"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditDialog(coupon)}
                        className="hover:opacity-70 transition-opacity text-blue-600"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{hasActiveFilters ? 'No coupons match your filters' : 'No coupons yet'}</p>
              <p className="text-sm mt-1">
                {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first coupon to get started'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) pageNum = currentPage - 2 + i;
                    if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                  }
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? "bg-blush hover:bg-[#f48c82]" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Coupon</DialogTitle>
            <DialogDescription>
              Set up a discount code for your customers
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SAVE20"
                  className="uppercase"
                />
              </div>
              
              <div>
                <Label htmlFor="type">Discount Type *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="value">Discount Value *</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: parseInt(e.target.value) || 0})}
                  min={0}
                  max={formData.type === "percentage" ? 100 : undefined}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === "percentage" ? "0-100%" : "In rupees"}
                </p>
              </div>

              <div>
                <Label htmlFor="minOrder">Minimum Order</Label>
                <Input
                  id="minOrder"
                  type="number"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({...formData, minOrder: parseInt(e.target.value) || 0})}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>

            {formData.type === "percentage" && (
              <div>
                <Label htmlFor="maxDiscount">Maximum Discount (Optional)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  value={formData.maxDiscount || ""}
                  onChange={(e) => setFormData({...formData, maxDiscount: parseInt(e.target.value) || undefined})}
                  min={0}
                  placeholder="₹200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cap the discount amount for percentage coupons
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({...formData, usageLimit: parseInt(e.target.value) || 100})}
                  min={1}
                />
                <p className="text-xs text-gray-500 mt-1">Total redemptions allowed</p>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.code || !formData.value}
              className="bg-blush hover:bg-[#f48c82]"
            >
              Create Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCoupon && editingCoupon.code !== formData.code} onOpenChange={() => setEditingCoupon(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update coupon settings
            </DialogDescription>
          </DialogHeader>
          
          {editingCoupon && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Coupon Code</div>
                <div className="text-2xl font-bold">{editingCoupon.code}</div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={editingCoupon.active}
                  onCheckedChange={(checked) => setEditingCoupon({...editingCoupon, active: checked})}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>

              <div>
                <Label htmlFor="edit-usageLimit">Usage Limit</Label>
                <Input
                  id="edit-usageLimit"
                  type="number"
                  value={editingCoupon.usageLimit}
                  onChange={(e) => setEditingCoupon({...editingCoupon, usageLimit: parseInt(e.target.value) || 100})}
                  min={1}
                />
              </div>

              <div>
                <Label htmlFor="edit-expiresAt">Expiration Date</Label>
                <Input
                  id="edit-expiresAt"
                  type="datetime-local"
                  value={editingCoupon.expiresAt ? new Date(editingCoupon.expiresAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditingCoupon({...editingCoupon, expiresAt: e.target.value ? new Date(e.target.value) : undefined})}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCoupon(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-blush hover:bg-[#f48c82]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!showBulkConfirm} onOpenChange={() => setShowBulkConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className={
                showBulkConfirm?.action === 'delete' ? "text-red-500" :
                showBulkConfirm?.action === 'activate' ? "text-green-500" : "text-orange-500"
              } />
              Confirm Bulk {showBulkConfirm?.action.charAt(0).toUpperCase()}{showBulkConfirm?.action.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {showBulkConfirm?.action} {showBulkConfirm?.count} coupon{showBulkConfirm?.count !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkConfirm(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => showBulkConfirm && executeBulkAction(showBulkConfirm.action)}
              disabled={bulkActionLoading}
              className={
                showBulkConfirm?.action === 'delete' ? "bg-red-500 hover:bg-red-600" :
                showBulkConfirm?.action === 'activate' ? "bg-green-500 hover:bg-green-600" : "bg-orange-500 hover:bg-orange-600"
              }
            >
              {bulkActionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
