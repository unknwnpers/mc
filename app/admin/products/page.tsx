"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Package, Plus, Pencil, Archive, RefreshCw, X, Save,
  Check, Loader2, Image as ImageIcon, Trash2, GripVertical, ChevronRight,
  AlertTriangle
} from "lucide-react";
import type { ProductVariant, ProductOption } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  category_slug: string;
  options: ProductOption[];
  variants: ProductVariant[];
  isActive: boolean;
  is_featured: boolean;
  createdAt: any;
}

interface FormState {
  name: string;
  description: string;
  imageInput: string;      // current URL input
  images: string[];        // committed image URLs
  category_slug: string;
  is_featured: boolean;
  isActive: boolean;
  sizeInput: string;       // current size being typed
  variants: ProductVariant[];
}

interface ImageUploadPreview {
  id: string;
  file: File;
  preview: string;
}

const EMPTY_FORM: FormState = {
  name: "", description: "", imageInput: "", images: [],
  category_slug: "", is_featured: false, isActive: true,
  sizeInput: "", variants: [],
};

const CATEGORY_OPTIONS = [
  { label: "Maternity Wear",   value: "maternity-wear" },
  { label: "Kids Clothing",    value: "kids-clothing" },
  { label: "Baby Essentials",  value: "baby-essentials" },
  { label: "Feeding & Nursing",value: "feeding-nursing" },
  { label: "Accessories",      value: "accessories" },
];

// ── Auth helper ───────────────────────────────────────────────────────────────
async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const { user, profile, loading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  const [products, setProducts]   = useState<Product[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState<FormState>({ ...EMPTY_FORM });
  const [stockEdit, setStockEdit] = useState<{ productId: string; sku: string; stock: number } | null>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ productId: string; productName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<ImageUploadPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const res  = await adminFetch("/api/admin/products?includeArchived=true");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products || []);
    } catch (e: any) {
      toast.error(e.message || "Could not load products");
    } finally { setFetching(false); }
  }, [user, isAdmin]);

  useEffect(() => { if (!loading && isAdmin) fetchProducts(); }, [loading, isAdmin, fetchProducts]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(p => URL.revokeObjectURL(p.preview));
    };
  }, [imagePreviews]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name:          p.name,
      description:   p.description || "",
      imageInput:    "",
      images:        p.images || [],
      category_slug: p.category_slug || "",
      is_featured:   p.is_featured || false,
      isActive:      p.isActive !== false,
      sizeInput:     "",
      variants:      p.variants || [],
    });
    setShowForm(true);
  }
  function closeForm() { 
    setShowForm(false); 
    setEditing(null);
    // Cleanup all object URLs to prevent memory leaks
    imagePreviews.forEach(p => URL.revokeObjectURL(p.preview));
    setImagePreviews([]); 
  }

  // ── Image file handling ───────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews: ImageUploadPreview[] = files.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
    toast.info(`${files.length} image${files.length > 1 ? 's' : ''} selected for upload`);
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePreview(id: string) {
    setImagePreviews(prev => prev.filter(p => p.id !== id));
  }

  async function uploadImages(): Promise<string[]> {
    // TODO: Implement Firebase Storage upload here
    // For now, just return existing URLs - file uploads are preview-only
    if (imagePreviews.length > 0) {
      toast.warning('Image upload coming soon. Use URL method for now.');
    }
    return form.images;
  }

  // ── Image helpers ─────────────────────────────────────────────────────────
  function addImage() {
    const url = form.imageInput.trim();
    if (!url) return;
    if (form.images.includes(url)) { toast.error("Image URL already added"); return; }
    try { new URL(url); } catch { toast.error("Enter a valid URL"); return; }
    setForm(f => ({ ...f, images: [...f.images, url], imageInput: "" }));
  }
  function removeImage(url: string) {
    setForm(f => ({ ...f, images: f.images.filter(u => u !== url) }));
  }

  // ── Variant (size) helpers ────────────────────────────────────────────────
  function addSize() {
    const raw = form.sizeInput.trim();
    if (!raw) return;
    if (form.variants.some(v => v.sku === raw)) { toast.error(`Size "${raw}" already added`); return; }
    const newVariant: ProductVariant = { sku: raw, options: { Size: raw }, price: 0, stock: 0 };
    setForm(f => ({ ...f, variants: [...f.variants, newVariant], sizeInput: "" }));
  }
  function removeVariant(sku: string) {
    setForm(f => ({ ...f, variants: f.variants.filter(v => v.sku !== sku) }));
  }
  function setVariantField(sku: string, field: "price" | "stock", val: string) {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => v.sku === sku ? { ...v, [field]: Number(val) } : v),
    }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveProduct() {
    if (!form.name.trim()) return toast.error("Product name is required");
    if (form.variants.length === 0) return toast.error("Add at least one size");

    // Handle image uploads (future Firebase Storage integration)
    let finalImages = form.images;
    if (imagePreviews.length > 0) {
      setSaving(true);
      toast.info('Uploading images...');
      try {
        finalImages = await uploadImages();
      } catch (err) {
        toast.error('Image upload failed. Using URL images only.');
      }
    }

    setSaving(true);
    try {
      const body = {
        name:          form.name.trim(),
        description:   form.description,
        images:        finalImages,
        category_slug: form.category_slug,
        is_featured:   form.is_featured,
        isActive:      form.isActive,
        options:       [{ name: "Size", values: form.variants.map(v => v.sku) }],
        variants:      form.variants,
      };

      const res = editing
        ? await adminFetch("/api/admin/products", { method: "PATCH", body: JSON.stringify({ id: editing.id, data: body }) })
        : await adminFetch("/api/admin/products", { method: "POST",  body: JSON.stringify(body) });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Product updated!" : "Product created!");
      closeForm();
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setSaving(false); }
  }

  async function archiveProduct(id: string, name: string) {
    if (!confirm(`Archive "${name}"? It will be hidden from the store but can be restored.`)) return;
    try {
      const res  = await adminFetch("/api/admin/products", { method: "DELETE", body: JSON.stringify({ id, action: "archive" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product archived");
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteProductPermanently() {
    if (!deleteConfirm) return;
    
    // Extra confirmation step
    const confirmed = confirm(
      `⚠️ PERMANENTLY DELETE "${deleteConfirm.productName}"?

This action CANNOT be undone. The product will be removed from the database forever.

Type "DELETE" to confirm (press OK).`
    );
    
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await adminFetch("/api/admin/products", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteConfirm.productId, action: "delete_permanently" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product permanently deleted");
      setDeleteConfirm(null);
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function saveStock() {
    if (!stockEdit) return;
    setSavingStock(true);
    try {
      const res  = await adminFetch("/api/admin/inventory", {
        method: "POST",
        body: JSON.stringify({ productId: stockEdit.productId, sku: stockEdit.sku, stock: stockEdit.stock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Stock updated`);
      setStockEdit(null);
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingStock(false); }
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-white" />
    </div>
  );

  if (!user || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <a href="/" className="text-sm text-white/50 hover:text-white transition-colors">← Return to Store</a>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Products</h1>
              <p className="text-white/40 text-sm">{products.filter(p => p.isActive).length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchProducts} disabled={fetching}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-40">
              <RefreshCw className={cn("w-4 h-4 text-white/60", fetching && "animate-spin")} />
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/90 transition-all">
              <Plus className="w-4 h-4" /> New Product
            </button>
          </div>
        </div>

        {/* ── Product Grid ────────────────────────────────────────────────── */}
        {fetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-white/3 rounded-2xl border border-white/10 border-dashed">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">No products yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {products.map(p => (
              <div key={p.id} className={cn(
                "bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group",
                !p.isActive && "opacity-40"
              )}>
                {/* Image */}
                <div className="h-40 bg-white/5 flex items-center justify-center overflow-hidden">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <ImageIcon className="w-8 h-8 text-white/20" />
                  }
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      {!p.isActive  && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">Archived</span>}
                      {p.is_featured && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">Featured</span>}
                    </div>
                  </div>

                  {/* Variant pills */}
                  {p.variants?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.variants.map(v => (
                        <button key={v.sku}
                          onClick={() => setStockEdit({ productId: p.id, sku: v.sku, stock: v.stock })}
                          className={cn(
                            "text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:border-white/30",
                            v.stock === 0
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : "border-white/10 bg-white/5 text-white/60"
                          )}>
                          {v.sku} · ₹{v.price} · {v.stock === 0 ? "OOS" : `${v.stock}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-white/5">
                    <button onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/60 bg-white/5 hover:bg-white/10 py-2 rounded-xl transition-all">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    {p.isActive && (
                      <>
                        <button onClick={() => setDeleteConfirm({ productId: p.id, productName: p.name })}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-400/80 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => archiveProduct(p.id, p.name)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/80 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 rounded-xl transition-all">
                          <Archive className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Delete Confirmation Modal ───────────────────────────────────── */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-red-500/30 rounded-2xl p-8 w-full max-w-md">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Permanent Delete</h2>
                  <p className="text-red-400/80 text-sm">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-white/80 text-sm mb-1">You are about to permanently delete:</p>
                <p className="text-white font-bold text-base">{deleteConfirm.productName}</p>
                <p className="text-white/40 text-xs mt-2 font-mono">ID: {deleteConfirm.productId.slice(0, 24)}...</p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-2 text-sm">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-white/60">All product data will be lost forever</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-white/60">Order history referencing this product will break</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-white/60">Consider archiving instead if you might need it later</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 bg-white/5 text-white/60 font-semibold py-3 rounded-xl hover:bg-white/10 transition-all text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={deleteProductPermanently} disabled={deleting}
                  className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stock Edit Modal ─────────────────────────────────────────────── */}
        {stockEdit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-xs">
              <h2 className="text-lg font-bold text-white mb-1">Update Stock</h2>
              <p className="text-white/40 text-sm mb-6">SKU: <span className="text-white font-mono">{stockEdit.sku}</span></p>
              <input type="number" min={0} value={stockEdit.stock}
                onChange={e => setStockEdit({ ...stockEdit, stock: Number(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-3xl font-bold text-white text-center mb-6 focus:outline-none focus:border-white/30" />
              <div className="flex gap-3">
                <button onClick={() => setStockEdit(null)}
                  className="flex-1 bg-white/5 text-white/60 font-semibold py-3 rounded-xl hover:bg-white/10 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={saveStock} disabled={savingStock}
                  className="flex-1 bg-white text-black font-semibold py-3 rounded-xl hover:bg-white/90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Product Drawer ───────────────────────────────────────────────── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-xl h-full bg-[#111] border-l border-white/10 flex flex-col overflow-hidden">

              {/* Drawer header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white">{editing ? "Edit Product" : "New Product"}</h2>
                  <p className="text-white/40 text-xs mt-0.5">{editing ? editing.name : "Fill in the details below"}</p>
                </div>
                <button onClick={closeForm} className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

                {/* ── Basic Info ────────────────────────────────────────── */}
                <section>
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Basic Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1.5">Product Name *</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Maternity Jogger"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1.5">Description</label>
                      <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        rows={3} placeholder="Short product description..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1.5">Category</label>
                      <select value={form.category_slug} onChange={e => setForm(f => ({ ...f, category_slug: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-all appearance-none">
                        <option value="">Select category...</option>
                        {CATEGORY_OPTIONS.map(c => (
                          <option key={c.value} value={c.value} className="bg-[#111]">{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* ── Images ───────────────────────────────────────────── */}
                <section>
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Product Images</h3>
                  
                  {/* URL Input */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-white/50 mb-2">Add via URL</label>
                    <div className="flex gap-2">
                      <input value={form.imageInput} onChange={e => setForm(f => ({ ...f, imageInput: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all" />
                      <button onClick={addImage}
                        className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                        <Plus className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-white/50 mb-2">Or upload files</label>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect}
                      className="hidden" id="image-upload" />
                    <label htmlFor="image-upload"
                      className="flex items-center justify-center gap-2 w-full bg-white/5 border border-dashed border-white/20 rounded-xl px-4 py-3 text-white/60 text-sm hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer">
                      <ImageIcon className="w-4 h-4" />
                      Choose Files
                    </label>
                    <p className="text-white/30 text-[10px] mt-1.5">Preview only — upload will be enabled soon</p>
                  </div>

                  {/* Committed Images */}
                  {form.images.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-white/50 mb-2">Added Images</label>
                      <div className="grid grid-cols-3 gap-2">
                        {form.images.map((url, i) => (
                          <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {i === 0 && <span className="text-[9px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full absolute top-2 left-2">Main</span>}
                              <button onClick={() => removeImage(url)} className="p-1.5 bg-red-500/80 rounded-lg">
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Previews */}
                  {imagePreviews.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-2">Files to Upload</label>
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map(preview => (
                          <div key={preview.id} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group">
                            <img src={preview.preview} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => removePreview(preview.id)} className="p-1.5 bg-red-500/80 rounded-lg">
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {form.images.length === 0 && imagePreviews.length === 0 && (
                    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center">
                      <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-white/30 text-xs">No images yet. Add via URL or upload files.</p>
                    </div>
                  )}
                </section>

                {/* ── Settings ─────────────────────────────────────────── */}
                <section>
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Settings</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Active (visible in store)",    key: "isActive"    as const },
                      { label: "Featured on homepage",         key: "is_featured" as const },
                    ].map(({ label, key }) => (
                      <button key={key} onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                        className="w-full flex items-center justify-between bg-white/3 hover:bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 transition-all">
                        <span className="text-sm text-white/70 font-medium">{label}</span>
                        <div className={cn("h-5 w-9 rounded-full transition-colors relative", form[key] ? "bg-green-500" : "bg-white/10")}>
                          <div className={cn("absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform", form[key] ? "translate-x-4" : "translate-x-0.5")} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* ── Sizes & Pricing ──────────────────────────────────── */}
                <section>
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Sizes & Pricing *</h3>
                  <p className="text-white/40 text-xs mb-4 leading-relaxed">
                    Supports any format: <span className="font-mono text-white/60">S, M, L</span> or <span className="font-mono text-white/60">30, 32</span> or <span className="font-mono text-white/60">3-6M, Free Size</span>
                  </p>

                  <div className="flex gap-2 mb-4">
                    <input value={form.sizeInput} onChange={e => setForm(f => ({ ...f, sizeInput: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSize())}
                      placeholder="Enter size (e.g. S, 30, 3-6M)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all" />
                    <button onClick={addSize}
                      className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                      <Plus className="w-4 h-4 text-white/60" />
                    </button>
                  </div>

                  {form.variants.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-xl p-6 text-center">
                      <p className="text-white/30 text-xs">No sizes yet. Type a size above and press Enter.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Column headers */}
                      <div className="grid grid-cols-[80px_1fr_1fr_32px] gap-3 px-4">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Size</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Price (₹)</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stock</span>
                        <span />
                      </div>

                      {form.variants.map(v => (
                        <div key={v.sku} className="grid grid-cols-[80px_1fr_1fr_32px] gap-3 items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-all">
                          <span className="text-sm font-bold text-white font-mono">{v.sku}</span>
                          <input type="number" min={0} value={v.price === 0 ? "" : v.price}
                            placeholder="0"
                            onChange={e => setVariantField(v.sku, "price", e.target.value)}
                            className="bg-transparent border-b border-white/10 pb-0.5 text-white text-sm focus:outline-none focus:border-white/40 w-full" />
                          <input type="number" min={0} value={v.stock === 0 ? "" : v.stock}
                            placeholder="0"
                            onChange={e => setVariantField(v.sku, "stock", e.target.value)}
                            className="bg-transparent border-b border-white/10 pb-0.5 text-white text-sm focus:outline-none focus:border-white/40 w-full" />
                          <button onClick={() => removeVariant(v.sku)}
                            className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-all group">
                            <X className="w-3 h-3 text-red-400/60 group-hover:text-red-400 transition-colors" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>

              {/* Drawer footer */}
              <div className="px-8 py-6 border-t border-white/10 flex gap-3 bg-[#111]">
                <button onClick={closeForm}
                  className="flex-1 bg-white/5 text-white/60 font-semibold py-3.5 rounded-xl hover:bg-white/10 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={saveProduct} disabled={saving}
                  className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-white/90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save Changes" : "Create Product"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
