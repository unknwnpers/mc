"use client";

import { useEffect, useState, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Tag, 
  Percent, 
  IndianRupee, 
  Calendar,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Power,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

interface Offer {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  appliesTo: 'all' | 'category' | 'product';
  categorySlug?: string;
  productIds?: string[];
  startDate?: string;
  endDate?: string;
  displayText: string;
  createdAt: string;
}

async function adminFetch(url: string, options?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

export default function AdminOffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 20,
    isActive: true,
    appliesTo: 'all' as 'all' | 'category' | 'product',
    categorySlug: '',
    productIds: [] as string[],
    displayText: 'SAVE 20%',
    startDate: '',
    endDate: ''
  });

  // Products for selection
  const [products, setProducts] = useState<Array<{id: string; name: string}>>([]);
  const [productSearch, setProductSearch] = useState('');

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired' | 'scheduled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [appliesToFilter, setAppliesToFilter] = useState<'all' | 'all_products' | 'category' | 'product'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting states
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'startDate' | 'endDate' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  // Bulk operations states
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{ action: 'activate' | 'deactivate' | 'delete'; count: number } | null>(null);

  // Quick toggle loading state
  const [togglingOfferId, setTogglingOfferId] = useState<string | null>(null);

  useEffect(() => {
    fetchOffers();
    fetchProducts();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/api/admin/offers?_t=${Date.now()}`);
      if (data.success) {
        setOffers(data.offers);
      } else {
        toast.error(data.error || 'Failed to fetch offers');
      }
    } catch (error) {
      toast.error('Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      value: Number(formData.value),
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined
    };

    try {
      if (editingOffer) {
        // Update
        const data = await adminFetch(`/api/admin/offers/${editingOffer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (data.success) {
          toast.success('Offer updated successfully');
        } else {
          toast.error(data.error || 'Failed to update offer');
        }
      } else {
        // Create
        const data = await adminFetch('/api/admin/offers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (data.success) {
          toast.success('Offer created successfully');
        } else {
          toast.error(data.error || 'Failed to create offer');
        }
      }
      
      setShowForm(false);
      setEditingOffer(null);
      resetForm();
      fetchOffers();
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const data = await adminFetch(`/api/admin/offers/${id}`, {
        method: 'DELETE'
      });
      if (data.success) {
        toast.success('Offer deleted successfully');
        fetchOffers();
      } else {
        toast.error(data.error || 'Failed to delete offer');
      }
    } catch (error) {
      toast.error('Failed to delete offer');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'percentage',
      value: 20,
      isActive: true,
      appliesTo: 'all',
      categorySlug: '',
      productIds: [],
      displayText: 'SAVE 20%',
      startDate: '',
      endDate: ''
    });
  };

  const fetchProducts = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    
    // Helper to convert Firestore Timestamp or string to date input format (YYYY-MM-DD)
    const toDateInputValue = (dateValue: any): string => {
      if (!dateValue) return '';
      try {
        // Handle Firestore Timestamp {seconds, nanoseconds}
        if (dateValue.seconds) {
          return new Date(dateValue.seconds * 1000).toISOString().split('T')[0];
        }
        // Handle string in DD-MM-YYYY format
        if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = dateValue.split('-');
          return `${year}-${month}-${day}`;
        }
        // Handle string in YYYY-MM-DD format
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateValue;
        }
        // Handle Date object
        if (dateValue instanceof Date) {
          return dateValue.toISOString().split('T')[0];
        }
        // Fallback
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };
    
    setFormData({
      name: offer.name,
      type: offer.type,
      value: offer.value,
      isActive: offer.isActive,
      appliesTo: offer.appliesTo,
      categorySlug: offer.categorySlug || '',
      productIds: offer.productIds || [],
      displayText: offer.displayText,
      startDate: toDateInputValue(offer.startDate),
      endDate: toDateInputValue(offer.endDate)
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingOffer(null);
    resetForm();
    setShowForm(true);
  };

  const formatDate = (dateValue?: any) => {
    if (!dateValue) return 'No expiry';
    try {
      // Handle Firestore Timestamp {seconds, nanoseconds}
      if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString('en-IN');
      }
      // Handle string in DD-MM-YYYY format (common in India)
      if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateValue.split('-');
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-IN');
      }
      // Handle string in YYYY-MM-DD format
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(dateValue).toLocaleDateString('en-IN');
      }
      // Handle Date object
      if (dateValue instanceof Date) {
        return dateValue.toLocaleDateString('en-IN');
      }
      // Fallback: try to parse as is
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'No expiry';
      return date.toLocaleDateString('en-IN');
    } catch {
      return 'No expiry';
    }
  };

  const isOfferActive = (offer: Offer) => {
    if (!offer.isActive) return false;
    const now = new Date();
    
    // Helper to get Date from Firestore Timestamp or string
    const getDate = (dateValue: any): Date | null => {
      if (!dateValue) return null;
      try {
        if (dateValue.seconds) {
          return new Date(dateValue.seconds * 1000);
        }
        // Handle string in DD-MM-YYYY format
        if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
          const [day, month, year] = dateValue.split('-');
          const date = new Date(`${year}-${month}-${day}`);
          return isNaN(date.getTime()) ? null : date;
        }
        // Handle string in YYYY-MM-DD format
        if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? null : date;
        }
        // Handle Date object
        if (dateValue instanceof Date) {
          return dateValue;
        }
        // Fallback
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };
    
    const startDate = getDate(offer.startDate);
    const endDate = getDate(offer.endDate);
    
    if (startDate && startDate > now) return false;
    if (endDate && endDate < now) return false;
    return true;
  };

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let result = offers.filter(offer => {
      // Search by name
      const matchesSearch = searchTerm === '' || 
        offer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.displayText.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const now = new Date();
        const startDate = offer.startDate ? new Date(offer.startDate) : null;
        const endDate = offer.endDate ? new Date(offer.endDate) : null;
        
        switch (statusFilter) {
          case 'active':
            matchesStatus = offer.isActive && 
              (!startDate || startDate <= now) && 
              (!endDate || endDate >= now);
            break;
          case 'inactive':
            matchesStatus = !offer.isActive;
            break;
          case 'expired':
            matchesStatus = endDate !== null && endDate < now;
            break;
          case 'scheduled':
            matchesStatus = startDate !== null && startDate > now;
            break;
        }
      }

      // Type filter
      const matchesType = typeFilter === 'all' || offer.type === typeFilter;

      // Applies to filter
      const matchesAppliesTo = appliesToFilter === 'all' || 
        (appliesToFilter === 'all_products' && offer.appliesTo === 'all') ||
        offer.appliesTo === appliesToFilter;

      return matchesSearch && matchesStatus && matchesType && matchesAppliesTo;
    });

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'startDate':
          const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
          comparison = aStart - bStart;
          break;
        case 'endDate':
          const aEnd = a.endDate ? new Date(a.endDate).getTime() : Infinity;
          const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
          comparison = aEnd - bEnd;
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
  }, [offers, searchTerm, statusFilter, typeFilter, appliesToFilter, sortBy, sortOrder]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || appliesToFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setAppliesToFilter('all');
    setCurrentPage(1);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredOffers.length / itemsPerPage);
  const paginatedOffers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOffers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOffers, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, appliesToFilter, sortBy, sortOrder]);

  // ── Bulk Operations ───────────────────────────────────────────────────────
  function toggleOfferSelection(id: string) {
    setSelectedOffers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  function selectAllOffers() {
    if (selectedOffers.size === paginatedOffers.length) {
      setSelectedOffers(new Set());
    } else {
      setSelectedOffers(new Set(paginatedOffers.map(o => o.id)));
    }
  }

  async function executeBulkAction(action: 'activate' | 'deactivate' | 'delete') {
    if (selectedOffers.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const ids = Array.from(selectedOffers);
      
      if (action === 'delete') {
        // Delete offers one by one
        for (const id of ids) {
          await fetch(`/api/admin/offers/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        toast.success(`Deleted ${ids.length} offer${ids.length !== 1 ? 's' : ''}`);
      } else {
        // Activate/deactivate via bulk API
        const res = await fetch('/api/admin/offers/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, ids }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`${action === 'activate' ? 'Activated' : 'Deactivated'} ${ids.length} offer${ids.length !== 1 ? 's' : ''}`);
        } else {
          toast.error(data.error || 'Bulk action failed');
        }
      }
      
      setSelectedOffers(new Set());
      fetchOffers();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Bulk action failed');
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirm(null);
    }
  }

  // Quick toggle offer active status
  async function quickToggleOffer(offer: Offer) {
    setTogglingOfferId(offer.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Offer ${offer.isActive ? 'deactivated' : 'activated'}`);
        fetchOffers();
      } else {
        toast.error(data.error || 'Failed to toggle offer');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to toggle offer');
    } finally {
      setTogglingOfferId(null);
    }
  }

  // Duplicate an offer
  async function duplicateOffer(offer: Offer) {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const payload = {
        name: `${offer.name} (Copy)`,
        type: offer.type,
        value: offer.value,
        isActive: false, // Start as inactive
        appliesTo: offer.appliesTo,
        categorySlug: offer.categorySlug,
        productIds: offer.productIds,
        displayText: offer.displayText,
        startDate: '',
        endDate: ''
      };

      const res = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Offer duplicated successfully');
        fetchOffers();
        // Scroll to top to see the new offer
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data.error || 'Failed to duplicate offer');
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate offer');
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Offers & Discounts</h1>
            <p className="text-white/40 mt-1">Manage promotional offers and discounts</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blush text-white px-6 py-3 rounded-xl font-medium hover:bg-blush/90 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Offer
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search offers by name or display text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blush"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4 text-white/40" />
                </button>
              )}
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all",
                showFilters || hasActiveFilters
                  ? "bg-blush/20 border-blush text-blush"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-5 h-5 rounded-full bg-blush text-white text-xs flex items-center justify-center">
                  {[statusFilter, typeFilter, appliesToFilter].filter(f => f !== 'all').length + (searchTerm ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-white/60 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blush"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blush"
                >
                  <option value="all">All Types</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              {/* Applies To Filter */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Applies To</label>
                <select
                  value={appliesToFilter}
                  onChange={(e) => setAppliesToFilter(e.target.value as typeof appliesToFilter)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blush"
                >
                  <option value="all">All</option>
                  <option value="all_products">All Products</option>
                  <option value="category">Category</option>
                  <option value="product">Specific Products</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Sort By</label>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blush"
                  >
                    <option value="created">Created Date</option>
                    <option value="name">Name</option>
                    <option value="value">Value</option>
                    <option value="startDate">Start Date</option>
                    <option value="endDate">End Date</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-sm">
              Showing {filteredOffers.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredOffers.length)} of {filteredOffers.length} offers
              {filteredOffers.length !== offers.length && ` (filtered from ${offers.length})`}
            </p>
            
            {/* Items per page selector */}
            {filteredOffers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blush"
                >
                  <option value={6}>6</option>
                  <option value={9}>9</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedOffers.size > 0 && (
          <div className="mb-6 bg-blush/10 border border-blush/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-blush" />
              <span className="font-medium text-blush">
                {selectedOffers.size} offer{selectedOffers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkConfirm({ action: 'activate', count: selectedOffers.size })}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium"
              >
                Activate
              </button>
              <button
                onClick={() => setShowBulkConfirm({ action: 'deactivate', count: selectedOffers.size })}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm font-medium"
              >
                Deactivate
              </button>
              <button
                onClick={() => setShowBulkConfirm({ action: 'delete', count: selectedOffers.size })}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                Delete
              </button>
              <div className="w-px h-6 bg-blush/30 mx-1" />
              <button
                onClick={() => setSelectedOffers(new Set())}
                className="px-4 py-2 text-blush hover:text-blush/80 transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Offers Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <Tag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white/60">
              {hasActiveFilters ? 'No offers match your filters' : 'No offers yet'}
            </h3>
            <p className="text-white/40 mt-2">
              {hasActiveFilters ? 'Try adjusting your search or filters' : 'Create your first promotional offer'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedOffers.map((offer) => (
              <div
                key={offer.id}
                className={cn(
                  "bg-white/5 border rounded-2xl p-6 transition-all relative",
                  selectedOffers.has(offer.id)
                    ? "border-blush/50 bg-blush/5"
                    : isOfferActive(offer) 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-white/10 opacity-60"
                )}
              >
                {/* Checkbox */}
                <div className="absolute top-4 left-4">
                  <input
                    type="checkbox"
                    checked={selectedOffers.has(offer.id)}
                    onChange={() => toggleOfferSelection(offer.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-blush focus:ring-blush cursor-pointer"
                  />
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4 pl-8">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                    isOfferActive(offer)
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/40"
                  )}>
                    {isOfferActive(offer) ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    {/* Quick Toggle */}
                    <button
                      onClick={() => quickToggleOffer(offer)}
                      disabled={togglingOfferId === offer.id}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        offer.isActive 
                          ? "bg-green-500/10 hover:bg-green-500/20 text-green-400" 
                          : "bg-white/5 hover:bg-white/10 text-white/40"
                      )}
                      title={offer.isActive ? 'Deactivate offer' : 'Activate offer'}
                    >
                      {togglingOfferId === offer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => duplicateOffer(offer)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                      title="Duplicate offer"
                    >
                      <Copy className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => openEdit(offer)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <Pencil className="w-4 h-4 text-white/60" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(offer.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Offer Details */}
                <h3 className="text-xl font-bold mb-2">{offer.name}</h3>
                <p className="text-3xl font-bold text-blush mb-4">
                  {offer.type === 'percentage' ? `${offer.value}%` : `₹${offer.value}`}
                  <span className="text-sm font-normal text-white/40 ml-2">
                    {offer.type === 'percentage' ? 'OFF' : 'FLAT OFF'}
                  </span>
                </p>

                {/* Display Text */}
                <div className="bg-white/5 rounded-lg px-3 py-2 mb-4">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Display Text</span>
                  <p className="text-sm font-medium">{offer.displayText}</p>
                </div>

                {/* Applicability */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Tag className="w-4 h-4" />
                    <span>
                      {offer.appliesTo === 'all' && 'All Products'}
                      {offer.appliesTo === 'category' && `Category: ${PRODUCT_CATEGORIES[offer.categorySlug as keyof typeof PRODUCT_CATEGORIES] || offer.categorySlug}`}
                      {offer.appliesTo === 'product' && `${offer.productIds?.length || 0} Products`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {offer.startDate ? formatDate(offer.startDate) : 'Start: Immediate'} 
                      {' → '}
                      {formatDate(offer.endDate)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Previous
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
                        "w-10 h-10 rounded-lg text-sm font-medium transition-all",
                        currentPage === pageNum
                          ? "bg-blush text-white"
                          : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
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
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
          </>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl p-6 max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {editingOffer ? 'Edit Offer' : 'Create Offer'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingOffer(null);
                    resetForm();
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Offer Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blush"
                    required
                  />
                </div>

                {/* Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Discount Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Value</label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      min={1}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                      required
                    />
                  </div>
                </div>

                {/* Display Text */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Display Text</label>
                  <input
                    type="text"
                    value={formData.displayText}
                    onChange={(e) => setFormData({ ...formData, displayText: e.target.value })}
                    placeholder="SAVE 20%"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blush"
                    required
                  />
                </div>

                {/* Applies To */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Applies To</label>
                  <select
                    value={formData.appliesTo}
                    onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value as 'all' | 'category' | 'product' })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                  >
                    <option value="all">All Products</option>
                    <option value="category">Specific Category</option>
                    <option value="product">Specific Products</option>
                  </select>
                </div>

                {/* Category Selection */}
                {formData.appliesTo === 'category' && (
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Category</label>
                    <select
                      value={formData.categorySlug}
                      onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                      required
                    >
                      <option value="">Select Category</option>
                      {Object.entries(PRODUCT_CATEGORIES).map(([slug, name]) => (
                        <option key={slug} value={slug}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Product Selection */}
                {formData.appliesTo === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">
                      Select Products ({formData.productIds.length} selected)
                    </label>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-blush mb-2"
                    />
                    <div className="max-h-48 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-2">
                      {products
                        .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(product => (
                          <label
                            key={product.id}
                            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.productIds.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, productIds: [...formData.productIds, product.id] });
                                } else {
                                  setFormData({ ...formData, productIds: formData.productIds.filter(id => id !== product.id) });
                                }
                              }}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blush focus:ring-blush"
                            />
                            <span className="text-sm text-white/80">{product.name}</span>
                          </label>
                        ))}
                      {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <p className="text-white/40 text-sm p-2">No products found</p>
                      )}
                    </div>
                    {formData.productIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, productIds: [] })}
                        className="text-xs text-white/40 hover:text-white/60 mt-1"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blush"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      formData.isActive ? "bg-green-500" : "bg-white/20"
                    )}
                  >
                    <span className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      formData.isActive ? "left-7" : "left-1"
                    )} />
                  </button>
                  <span className="text-sm font-medium">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOffer(null);
                      resetForm();
                    }}
                    className="flex-1 bg-white/5 text-white py-3 rounded-xl font-medium hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blush text-white py-3 rounded-xl font-medium hover:bg-blush/90 transition-all"
                  >
                    {editingOffer ? 'Update Offer' : 'Create Offer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Delete Offer?</h3>
                  <p className="text-white/60 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-white/5 text-white py-3 rounded-xl font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-500/90 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Confirmation */}
        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  showBulkConfirm.action === 'delete' ? "bg-red-500/10" : 
                  showBulkConfirm.action === 'activate' ? "bg-green-500/10" : "bg-orange-500/10"
                )}>
                  <AlertTriangle className={cn(
                    "w-6 h-6",
                    showBulkConfirm.action === 'delete' ? "text-red-400" : 
                    showBulkConfirm.action === 'activate' ? "text-green-400" : "text-orange-400"
                  )} />
                </div>
                <div>
                  <h3 className="text-lg font-bold capitalize">
                    {showBulkConfirm.action} {showBulkConfirm.count} Offer{showBulkConfirm.count !== 1 ? 's' : ''}?
                  </h3>
                  <p className="text-white/60 text-sm">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkConfirm(null)}
                  className="flex-1 bg-white/5 text-white py-3 rounded-xl font-medium hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeBulkAction(showBulkConfirm.action)}
                  disabled={bulkActionLoading}
                  className={cn(
                    "flex-1 text-white py-3 rounded-xl font-medium transition-all",
                    showBulkConfirm.action === 'delete' ? "bg-red-500 hover:bg-red-500/90" : 
                    showBulkConfirm.action === 'activate' ? "bg-green-500 hover:bg-green-500/90" : "bg-orange-500 hover:bg-orange-500/90"
                  )}
                >
                  {bulkActionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
