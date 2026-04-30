"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CuratedCollection } from "@/lib/types";
import {
  Plus, Pencil, Trash2, GripVertical, X, Save, Check,
  Loader2, Image as ImageIcon, ArrowUp, ArrowDown, Upload, Link as LinkIcon,
  Search, Minus
} from "lucide-react";

// ── Auth helper ───────────────────────────────────────────────────────────────
async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
const CARD_STYLES = [
  { value: "large", label: "Large (2 columns)" },
  { value: "compact", label: "Compact (1 column)" },
  { value: "banner", label: "Banner (full width)" },
];

const EMPTY_FORM: Omit<CuratedCollection, "id" | "createdAt" | "updatedAt"> = {
  title: "",
  subtitle: "",
  type: "manual",
  products: [],
  filter: { limit: 4 },
  displayOrder: 0,
  isActive: true,
  cardStyle: "compact",
  backgroundImage: "",
};

export default function AdminCollectionsPage() {
  const { user, profile, loading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  const [collections, setCollections] = useState<CuratedCollection[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CuratedCollection | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"url" | "upload">("upload");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product search state (for manual type)
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Selected products with metadata (name, image) for display
  const [selectedProductDetails, setSelectedProductDetails] = useState<Map<string, {name: string, image: string}>>(new Map());
  
  // Categories for filter (for auto type)
  const [categories, setCategories] = useState<{id: string, name: string, slug: string}[]>([]);
  
  // Type filter and search
  const [typeFilter, setTypeFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtered collections
  const filteredCollections = collections
    .filter(c => typeFilter === 'all' || c.type === typeFilter)
    .filter(c => !searchQuery.trim() || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCollections = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const res = await adminFetch(`/api/admin/collections?includeInactive=true&_t=${Date.now()}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned invalid response");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCollections(data.collections || []);
    } catch (e: any) {
      toast.error(e.message || "Could not load collections");
    } finally {
      setFetching(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!loading && isAdmin) {
      fetchCollections();
      fetchCategories();
    }
  }, [loading, isAdmin, fetchCollections]);

  // ── Fetch Categories ────────────────────────────────────────────────────────
  async function fetchCategories() {
    try {
      const res = await adminFetch("/api/admin/products?action=categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error("Failed to fetch categories", e);
    }
  }

  // ── Product Search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (productSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminFetch(`/api/admin/products/search?q=${encodeURIComponent(productSearch)}`);
        const data = await res.json();
        if (data.success) {
          // Filter out already selected products
          const selectedIds = form.products || [];
          setSearchResults(data.products.filter((p: any) => !selectedIds.includes(p.id)));
        }
      } catch (e) {
        console.error("Search failed", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [productSearch, form.products]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, displayOrder: collections.length });
    setShowForm(true);
  }

  async function openEdit(collection: CuratedCollection) {
    setEditing(collection);
    setForm({
      title: collection.title,
      subtitle: collection.subtitle || "",
      type: collection.type,
      products: collection.products || [],
      filter: collection.filter || { limit: 4 },
      displayOrder: collection.displayOrder,
      isActive: collection.isActive,
      cardStyle: collection.cardStyle,
      backgroundImage: collection.backgroundImage || "",
    });
    
    // Load product details for existing products in manual collections
    if (collection.type === "manual" && collection.products?.length) {
      try {
        const res = await adminFetch(`/api/admin/products?ids=${collection.products.join(",")}`);
        const data = await res.json();
        if (data.success && data.products) {
          const detailsMap = new Map<string, {name: string, image: string}>();
          data.products.forEach((p: any) => {
            detailsMap.set(p.id, { name: p.name, image: p.images?.[0] || '' });
          });
          setSelectedProductDetails(detailsMap);
        }
      } catch (e) {
        console.error("Failed to load product details", e);
      }
    }
    
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setImageInputMode("upload");
    setProductSearch("");
    setSearchResults([]);
    setSelectedProductDetails(new Map());
  }

  // ── Product Selection Helpers ───────────────────────────────────────────────
  function addProduct(product: { id: string; name: string; images?: string[] }) {
    setForm({
      ...form,
      products: [...(form.products || []), product.id],
    });
    // Store product details for display
    setSelectedProductDetails(prev => {
      const next = new Map(prev);
      next.set(product.id, { name: product.name, image: product.images?.[0] || '' });
      return next;
    });
    setProductSearch("");
    setSearchResults([]);
  }

  function removeProduct(productId: string) {
    setForm({
      ...form,
      products: (form.products || []).filter(id => id !== productId),
    });
    // Remove from details map
    setSelectedProductDetails(prev => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  // ── Image Upload ────────────────────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "system");
      formData.append("subcategory", "collection");

      const res = await fetch("/api/admin/images/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Use the public URL from the server response
      setForm({ ...form, backgroundImage: data.image?.url || data.image?.variants?.original?.url || "" });
      toast.success("Image uploaded successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const body = { ...form };

      const res = editing
        ? await adminFetch("/api/admin/collections", {
            method: "PATCH",
            body: JSON.stringify({ id: editing.id, data: body }),
          })
        : await adminFetch("/api/admin/collections", {
            method: "POST",
            body: JSON.stringify(body),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editing ? "Collection updated" : "Collection created");
      closeForm();
      fetchCollections();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection?")) return;
    try {
      const res = await adminFetch("/api/admin/collections", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Collection deleted");
      fetchCollections();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const index = collections.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === collections.length - 1) return;

    const newOrder = direction === "up" ? index - 1 : index + 1;
    const targetCollection = collections[newOrder];

    try {
      // Swap display orders
      await adminFetch("/api/admin/collections", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          data: { displayOrder: targetCollection.displayOrder },
        }),
      });
      await adminFetch("/api/admin/collections", {
        method: "PATCH",
        body: JSON.stringify({
          id: targetCollection.id,
          data: { displayOrder: collections[index].displayOrder },
        }),
      });

      toast.success("Order updated");
      fetchCollections();
    } catch (e: any) {
      toast.error(e.message || "Reorder failed");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Curated Collections</h1>
            <p className="text-white/50 text-sm">Manage homepage collection cards</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-xl font-semibold hover:bg-white/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Collection
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Type Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'manual', 'auto'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  typeFilter === type
                    ? "bg-white text-slate-950"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                {type === 'all' ? 'All' : type === 'manual' ? 'Manual' : 'Auto'}
                {type !== 'all' && (
                  <span className="ml-1.5 text-xs opacity-60">
                    ({collections.filter(c => c.type === type).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 text-sm"
            />
          </div>
        </div>

        {/* Collections List */}
        <div className="space-y-4">
          {filteredCollections.length === 0 && collections.length > 0 && (
            <div className="text-center py-12">
              <p className="text-white/50">No collections match your filters</p>
              <button
                onClick={() => { setTypeFilter('all'); setSearchQuery(''); }}
                className="mt-2 text-sm text-white/70 hover:text-white underline"
              >
                Clear filters
              </button>
            </div>
          )}
          {filteredCollections.map((collection, index) => (
            <div
              key={collection.id}
              className={cn(
                "bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4",
                !collection.isActive && "opacity-50"
              )}
            >
              {/* Drag Handle */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleReorder(collection.id, "up")}
                  disabled={index === 0}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4 text-white/60" />
                </button>
                <button
                  onClick={() => handleReorder(collection.id, "down")}
                  disabled={index === collections.length - 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Preview */}
              <div className="w-20 h-20 rounded-xl bg-white/5 overflow-hidden shrink-0">
                {collection.backgroundImage ? (
                  <img
                    src={collection.backgroundImage}
                    alt={collection.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-white/20" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {collection.title}
                  </h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    collection.isActive
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-neutral-500/20 text-neutral-400"
                  )}>
                    {collection.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    collection.type === "manual" 
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-purple-500/20 text-purple-400"
                  )}>
                    {collection.type === "manual" ? "Manual" : "Auto"}
                  </span>
                </div>
                <p className="text-white/50 text-sm truncate">{collection.subtitle}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                  <span>Style: {collection.cardStyle}</span>
                  <span>Order: {collection.displayOrder}</span>
                  {collection.type === "manual" ? (
                    <span className="text-blue-400/60">{collection.products?.length || 0} products</span>
                  ) : (
                    <span className="text-purple-400/60">
                      {collection.filter?.category || 'All cats'} • Limit: {collection.filter?.limit || 4}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(collection)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Pencil className="h-4 w-4 text-white/60" />
                </button>
                <button
                  onClick={() => handleDelete(collection.id)}
                  className="p-2 hover:bg-red-500/20 rounded-xl transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {collections.length === 0 && (
            <div className="text-center py-16">
              <ImageIcon className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No collections yet</h3>
              <p className="text-white/50 text-sm mb-4">Create your first curated collection</p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Collection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                {editing ? "Edit Collection" : "New Collection"}
              </h2>
              <button onClick={closeForm} className="p-2 hover:bg-white/10 rounded-xl">
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., New Arrivals"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g., Discover the latest..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
                <div className="flex gap-3">
                  {["manual", "auto"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setForm({ ...form, type: type as "manual" | "auto" })}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl border font-medium text-sm transition-all",
                        form.type === type
                          ? "bg-white text-slate-950 border-white"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {type === "manual" ? "Manual (Select Products)" : "Auto (Filter)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* MANUAL: Product Selection */}
              {form.type === "manual" && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-white/70">Selected Products</label>
                                
                  {/* Selected Products List */}
                  <div className="space-y-2">
                    {form.products?.map((productId) => {
                      const details = selectedProductDetails.get(productId);
                      return (
                        <div
                          key={productId}
                          className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {details?.image ? (
                              <img src={details.image} alt={details.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-white/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{details?.name || productId}</p>
                            <p className="text-white/40 text-xs truncate">{productId}</p>
                          </div>
                          <button
                            onClick={() => removeProduct(productId)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Minus className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                    {(!form.products || form.products.length === 0) && (
                      <p className="text-white/40 text-sm italic">No products selected</p>
                    )}
                  </div>
              
                  {/* Product Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products to add..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 animate-spin" />
                    )}
                  </div>
              
                  {/* Search Results */}
                  {searchResults.length > 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                        >
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                              <ImageIcon className="h-5 w-5 text-white/40" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-white text-sm">{product.name}</p>
                            <p className="text-white/40 text-xs">{product.category_slug}</p>
                          </div>
                          <Plus className="h-4 w-4 text-emerald-400" />
                        </button>
                      ))}
                    </div>
                  ) : productSearch.trim().length >= 2 && !searching ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                      <p className="text-white/50 text-sm">No products found for "{productSearch}"</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* AUTO: Filter Configuration */}
              {form.type === "auto" && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-white/70">Filter Configuration</label>
                  
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Category</label>
                    <select
                      value={form.filter?.category || ""}
                      onChange={(e) => setForm({
                        ...form,
                        filter: { ...form.filter, category: e.target.value || undefined, limit: form.filter?.limit || 4 }
                      })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                    >
                      <option value="" className="bg-slate-900">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug} className="bg-slate-900">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Featured Filter */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setForm({
                        ...form,
                        filter: { ...form.filter, isFeatured: !form.filter?.isFeatured, limit: form.filter?.limit || 4 }
                      })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        form.filter?.isFeatured ? "bg-emerald-500" : "bg-white/20"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                          form.filter?.isFeatured ? "left-5" : "left-0.5"
                        )}
                      />
                    </button>
                    <span className="text-white/70 text-sm">Featured products only</span>
                  </div>

                  {/* New Arrivals Filter */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setForm({
                        ...form,
                        filter: { ...form.filter, isNew: !form.filter?.isNew, limit: form.filter?.limit || 4 }
                      })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        form.filter?.isNew ? "bg-emerald-500" : "bg-white/20"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                          form.filter?.isNew ? "left-5" : "left-0.5"
                        )}
                      />
                    </button>
                    <span className="text-white/70 text-sm">New arrivals only</span>
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Max Price (₹)</label>
                    <input
                      type="number"
                      value={form.filter?.maxPrice || ""}
                      onChange={(e) => setForm({
                        ...form,
                        filter: { ...form.filter, maxPrice: e.target.value ? parseInt(e.target.value) : undefined, limit: form.filter?.limit || 4 }
                      })}
                      placeholder="No limit"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Number of Products *</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.filter?.limit || 4}
                      onChange={(e) => setForm({
                        ...form,
                        filter: { ...form.filter, limit: parseInt(e.target.value) || 4 }
                      })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              )}

              {/* Card Style */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Card Style</label>
                <select
                  value={form.cardStyle}
                  onChange={(e) => setForm({ ...form, cardStyle: e.target.value as any })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                >
                  {CARD_STYLES.map((style) => (
                    <option key={style.value} value={style.value} className="bg-slate-900">
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background Image */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Background Image</label>
                
                {/* Toggle between URL and Upload */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setImageInputMode("upload")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      imageInputMode === "upload"
                        ? "bg-white text-slate-950"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                  </button>
                  <button
                    onClick={() => setImageInputMode("url")}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      imageInputMode === "url"
                        ? "bg-white text-slate-950"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    URL
                  </button>
                </div>

                {imageInputMode === "upload" ? (
                  <>
                    {/* Drag & Drop Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                        dragOver
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-white/20 hover:border-white/40 bg-white/5"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      
                      {uploadingImage ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 text-white/40 animate-spin" />
                          <p className="text-white/60 text-sm">Uploading...</p>
                        </div>
                      ) : form.backgroundImage ? (
                        <div className="relative">
                          <img
                            src={form.backgroundImage}
                            alt="Preview"
                            className="max-h-40 mx-auto rounded-lg object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setForm({ ...form, backgroundImage: "" });
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-white/40" />
                          </div>
                          <div>
                            <p className="text-white/80 font-medium text-sm">
                              Drop image here or click to upload
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                              PNG, JPG, WebP up to 5MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* URL Input */
                  <input
                    type="text"
                    value={form.backgroundImage}
                    onChange={(e) => setForm({ ...form, backgroundImage: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  />
                )}

                {/* Image Preview for URL mode */}
                {imageInputMode === "url" && form.backgroundImage && (
                  <div className="mt-3 relative inline-block">
                    <img
                      src={form.backgroundImage}
                      alt="Preview"
                      className="h-20 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    form.isActive ? "bg-emerald-500" : "bg-white/20"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      form.isActive ? "left-7" : "left-1"
                    )}
                  />
                </button>
                <span className="text-white/70">{form.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-xl font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
