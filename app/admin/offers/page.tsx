"use client";

import { useEffect, useState } from "react";
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
  AlertTriangle
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
    displayText: 'SAVE 20%',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/api/admin/offers');
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
      displayText: 'SAVE 20%',
      startDate: '',
      endDate: ''
    });
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      type: offer.type,
      value: offer.value,
      isActive: offer.isActive,
      appliesTo: offer.appliesTo,
      categorySlug: offer.categorySlug || '',
      displayText: offer.displayText,
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : '',
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : ''
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingOffer(null);
    resetForm();
    setShowForm(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const isOfferActive = (offer: Offer) => {
    if (!offer.isActive) return false;
    const now = new Date();
    if (offer.startDate && new Date(offer.startDate) > now) return false;
    if (offer.endDate && new Date(offer.endDate) < now) return false;
    return true;
  };

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

        {/* Offers Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <Tag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white/60">No offers yet</h3>
            <p className="text-white/40 mt-2">Create your first promotional offer</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={cn(
                  "bg-white/5 border rounded-2xl p-6 transition-all",
                  isOfferActive(offer) 
                    ? "border-green-500/30 bg-green-500/5" 
                    : "border-white/10 opacity-60"
                )}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                    isOfferActive(offer)
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/40"
                  )}>
                    {isOfferActive(offer) ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
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
      </div>
    </div>
  );
}
