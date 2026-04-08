"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Save, Archive, Package, Loader2,
  Check, X, Plus, RefreshCw, ToggleLeft, ToggleRight,
  Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Variant = { price: number; stock: number };
type Variants = Record<string, Variant>;

interface ImageUploadPreview {
  id: string;
  file: File;
  preview: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  images: string[];
  variants: Variants;
  isActive: boolean;
  is_featured: boolean;
  category_slug: string;
  createdAt: any;
}

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export default function EditProductPage() {
  const { id }         = useParams() as { id: string };
  const router         = useRouter();
  const { user, profile, loading } = useAuth();
  const isAdmin        = profile?.role === "admin" || profile?.role === "superadmin";

  const [product,   setProduct]   = useState<Product | null>(null);
  const [fetching,  setFetching]  = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Editable fields
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [images,       setImages]       = useState("");      // comma-sep
  const [categorySlug, setCategorySlug] = useState("");
  const [isFeatured,   setIsFeatured]   = useState(false);
  const [isActive,     setIsActive]     = useState(true);
  const [variants,     setVariants]     = useState<Variants>({});
  const [newSize,      setNewSize]      = useState("");
  const [imagePreviews, setImagePreviews] = useState<ImageUploadPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch product ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && isAdmin && id) fetchProduct();
  }, [loading, isAdmin, id]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(p => URL.revokeObjectURL(p.preview));
    };
  }, [imagePreviews]);

  async function fetchProduct() {
    setFetching(true);
    try {
      const res  = await adminFetch(`/api/admin/products/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load product");
      hydrateForm(data.product);
      setProduct(data.product);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  }

  function hydrateForm(p: any) {
    setName(p.name || "");
    setDescription(p.description || "");
    setImages((p.images || []).join(", "));
    setCategorySlug(p.category_slug || "");
    setIsFeatured(p.is_featured || false);
    setIsActive(p.isActive ?? true);
    
    // Handle variants - convert array to object for form
    if (Array.isArray(p.variants)) {
      const variantsObj: Variants = {};
      p.variants.forEach((v: any) => {
        const size = v.options?.Size || v.sku;
        variantsObj[size] = { price: v.price, stock: v.stock };
      });
      setVariants(variantsObj);
    } else {
      setVariants({ ...(p.variants || {}) });
    }
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
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePreview(id: string) {
    setImagePreviews(prev => {
      const preview = prev.find(p => p.id === id);
      if (preview) URL.revokeObjectURL(preview.preview);
      return prev.filter(p => p.id !== id);
    });
  }

  async function uploadImages(): Promise<string[]> {
    // TODO: Implement Firebase Storage upload here
    if (imagePreviews.length > 0) {
      toast.warning('Image upload coming soon. Use URL method for now.');
    }
    const urlImages = images.split(",").map(s => s.trim()).filter(Boolean);
    return urlImages;
  }

  // ── Variant helpers ───────────────────────────────────────────────────────
  function togglePresetVariant(size: string) {
    setVariants(prev => {
      const v = { ...prev };
      if (v[size]) { delete v[size]; }
      else         { v[size] = { price: 0, stock: 0 }; }
      return v;
    });
  }

  function addCustomSize() {
    const trimmed = newSize.trim().toUpperCase();
    if (!trimmed) return;
    if (variants[trimmed]) { toast.info(`Size "${trimmed}" already exists`); return; }
    setVariants(prev => ({ ...prev, [trimmed]: { price: 0, stock: 0 } }));
    setNewSize("");
  }

  function setVariantField(size: string, field: "price" | "stock", val: string) {
    setVariants(prev => ({
      ...prev,
      [size]: { ...prev[size], [field]: Number(val) }
    }));
  }

  function removeVariant(size: string) {
    setVariants(prev => { const v = { ...prev }; delete v[size]; return v; });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function saveProduct() {
    if (!name.trim())                          return toast.error("Product name is required");
    if (Object.keys(variants).length === 0)    return toast.error("Add at least one size variant");

    for (const [size, v] of Object.entries(variants)) {
      if (v.price < 0 || v.stock < 0) return toast.error(`Invalid values for size ${size}`);
    }

    // Handle image uploads
    let finalImages: string[] = [];
    if (imagePreviews.length > 0) {
      setSaving(true);
      toast.info('Uploading images...');
      try {
        finalImages = await uploadImages();
      } catch (err) {
        toast.error('Image upload failed. Using URL images only.');
        finalImages = images.split(",").map(s => s.trim()).filter(Boolean);
      }
    } else {
      finalImages = images.split(",").map(s => s.trim()).filter(Boolean);
    }

    setSaving(true);
    try {
      // Convert variants object to array format expected by API
      const variantsArray = Object.entries(variants).map(([size, v]) => ({
        sku: size,
        options: { Size: size },
        price: v.price,
        stock: v.stock,
      }));

      const body = {
        name:          name.trim(),
        description,
        images:        finalImages,
        category_slug: categorySlug,
        is_featured:   isFeatured,
        isActive,
        variants:      variantsArray,
      };
      const res  = await adminFetch(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product updated!");
      router.push("/admin/products");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // ── Archive ───────────────────────────────────────────────────────────────
  async function archiveProduct() {
    if (!confirm(`Archive "${name}"? It will be hidden from the store.`)) return;
    setArchiving(true);
    try {
      const res  = await adminFetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Product archived");
      router.push("/admin/products");
    } catch (e: any) {
      toast.error(e.message || "Archive failed");
    } finally {
      setArchiving(false);
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-400 border-t-transparent" />
    </div>
  );

  if (!user || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md">
        <h1 className="text-3xl font-black text-neutral-900 mb-4">Access Denied</h1>
        <a href="/" className="inline-block bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all">
          Return to Store
        </a>
      </div>
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <p className="text-neutral-400 font-semibold">Product not found.</p>
    </div>
  );

  // ── Page ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32">

        {/* Breadcrumb */}
        <button onClick={() => router.push("/admin/products")}
          className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-neutral-700 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg text-white shrink-0">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-neutral-900 leading-tight">{name || "Edit Product"}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] text-neutral-400">{id.slice(0, 16)}…</span>
                {!isActive && <Badge variant="outline" className="text-[9px] border-red-200 text-red-500">Archived</Badge>}
                {isFeatured && <Badge variant="outline" className="text-[9px] border-amber-200 text-amber-600">Featured</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {product.isActive && (
              <button onClick={archiveProduct} disabled={archiving}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-50 text-red-500 hover:bg-red-100 font-bold text-sm transition-all disabled:opacity-50">
                {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                Archive
              </button>
            )}
            <button onClick={saveProduct} disabled={saving}
              className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-neutral-900 text-white hover:bg-rose-500 font-bold text-sm transition-all shadow-lg disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left Column — Core Fields ───────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 space-y-6">
              <h2 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Core Details</h2>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Product Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Maternity Jogger"
                  className="w-full border border-neutral-200 rounded-2xl px-5 py-3.5 font-semibold text-neutral-900 focus:outline-none focus:border-rose-300 transition-all text-lg" />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={4} placeholder="Short product description..."
                  className="w-full border border-neutral-200 rounded-2xl px-5 py-3.5 font-medium text-neutral-700 focus:outline-none focus:border-rose-300 transition-all resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">
                  Product Images
                </label>
                
                {/* URL Input */}
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5">Add via URL</label>
                  <textarea value={images} onChange={e => setImages(e.target.value)}
                    rows={2} placeholder="https://example.com/img1.jpg, https://..."
                    className="w-full border border-neutral-200 rounded-2xl px-5 py-3 text-sm text-neutral-700 focus:outline-none focus:border-rose-300 transition-all resize-none" />
                </div>

                {/* File Upload */}
                <div className="mb-3">
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1.5">Or upload files</label>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect}
                    className="hidden" id="edit-image-upload" />
                  <label htmlFor="edit-image-upload"
                    className="flex items-center justify-center gap-2 w-full bg-neutral-50 border border-dashed border-neutral-200 rounded-xl px-4 py-2.5 text-neutral-500 text-sm hover:bg-neutral-100 hover:border-neutral-300 transition-all cursor-pointer">
                    <ImageIcon className="w-4 h-4" />
                    Choose Files
                  </label>
                  <p className="text-[10px] text-neutral-400 mt-1.5">Preview only — upload will be enabled soon</p>
                </div>

                {/* URL Images Preview */}
                {images.split(",").filter(u => u.trim()).length > 0 && (
                  <div className="mb-3">
                    <label className="block text-[10px] font-semibold text-neutral-400 mb-2">Added Images</label>
                    <div className="flex gap-3 flex-wrap">
                      {images.split(",").map(u => u.trim()).filter(Boolean).map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-2xl border border-neutral-100 overflow-hidden bg-neutral-50 group">
                          <img src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                          <button onClick={() => setImages(images.split(",").filter((_, idx) => idx !== i).join(", "))}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Previews */}
                {imagePreviews.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-400 mb-2">Files to Upload</label>
                    <div className="grid grid-cols-4 gap-2">
                      {imagePreviews.map(preview => (
                        <div key={preview.id} className="relative w-20 h-20 rounded-xl border border-neutral-100 overflow-hidden bg-neutral-50 group">
                          <img src={preview.preview} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removePreview(preview.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Category Slug</label>
                <input value={categorySlug} onChange={e => setCategorySlug(e.target.value)}
                  placeholder="e.g. maternity-wear"
                  className="w-full border border-neutral-200 rounded-2xl px-5 py-3 text-sm text-neutral-700 focus:outline-none focus:border-rose-300 transition-all" />
              </div>
            </section>

            {/* ── Variants ─────────────────────────────────────────────── */}
            <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">
              <h2 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-6">Sizes & Pricing *</h2>

              {/* Size Presets */}
              <div className="flex flex-wrap gap-2 mb-5">
                {SIZE_PRESETS.map(size => (
                  <button key={size} onClick={() => togglePresetVariant(size)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                      variants[size]
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400"
                    )}>
                    {size}
                  </button>
                ))}
              </div>

              {/* Custom Size */}
              <div className="flex gap-2 mb-6">
                <input value={newSize} onChange={e => setNewSize(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomSize()}
                  placeholder="Custom size (e.g. 42, 3–6M)"
                  className="flex-1 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-rose-300 transition-all" />
                <button onClick={addCustomSize}
                  className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {/* Variant Rows */}
              {Object.keys(variants).length === 0 ? (
                <p className="text-center text-neutral-400 text-sm py-8 border-2 border-dashed border-neutral-100 rounded-2xl">
                  Select sizes above to set prices and stock
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-[60px_1fr_1fr_40px] gap-3 px-4">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Size</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Price (₹)</p>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Stock</p>
                  </div>
                  {Object.entries(variants).map(([size, v]) => (
                    <div key={size}
                      className={cn(
                        "grid grid-cols-[60px_1fr_1fr_40px] gap-3 items-center bg-neutral-50 rounded-2xl px-4 py-3 border",
                        v.stock === 0 ? "border-red-100" : "border-neutral-100"
                      )}>
                      <span className="text-sm font-black text-neutral-900">{size}</span>
                      <input type="number" min={0} value={v.price}
                        onChange={e => setVariantField(size, "price", e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-rose-300 transition-all" />
                      <input type="number" min={0} value={v.stock}
                        onChange={e => setVariantField(size, "stock", e.target.value)}
                        className={cn(
                          "w-full bg-white border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none transition-all",
                          v.stock === 0 ? "border-red-300 text-red-500 focus:border-red-400" : "border-neutral-200 focus:border-rose-300"
                        )} />
                      <button onClick={() => removeVariant(size)}
                        className="text-neutral-300 hover:text-red-400 transition-colors flex justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Right Column — Settings ──────────────────────────────────── */}
          <div className="space-y-6">

            <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-5">Settings</h2>

              {/* Active Toggle */}
              <div className="flex items-center justify-between py-3 border-b border-neutral-50">
                <div>
                  <p className="text-sm font-bold text-neutral-900">Active</p>
                  <p className="text-xs text-neutral-400">Visible in the store</p>
                </div>
                <button onClick={() => setIsActive(v => !v)}
                  className={cn("transition-colors", isActive ? "text-emerald-500" : "text-neutral-300")}>
                  {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold text-neutral-900">Featured</p>
                  <p className="text-xs text-neutral-400">Show on homepage</p>
                </div>
                <button onClick={() => setIsFeatured(v => !v)}
                  className={cn("transition-colors", isFeatured ? "text-amber-500" : "text-neutral-300")}>
                  {isFeatured ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </section>

            {/* Stock Summary */}
            <section className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6">
              <h2 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4">Stock Summary</h2>
              {Object.keys(variants).length === 0 ? (
                <p className="text-sm text-neutral-400">No variants configured</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(variants).map(([size, v]) => (
                    <div key={size} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-700 w-8">{size}</span>
                        <span className="text-xs text-neutral-400">₹{v.price}</span>
                      </div>
                      <span className={cn("text-xs font-black px-2.5 py-1 rounded-lg",
                        v.stock === 0  ? "bg-red-50 text-red-500" :
                        v.stock <= 3   ? "bg-amber-50 text-amber-600" :
                                         "bg-emerald-50 text-emerald-600"
                      )}>
                        {v.stock === 0 ? "OOS" : `${v.stock} left`}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-neutral-50 flex justify-between">
                    <span className="text-xs font-bold text-neutral-400">Total units</span>
                    <span className="text-xs font-black text-neutral-900">
                      {Object.values(variants).reduce((s, v) => s + v.stock, 0)}
                    </span>
                  </div>
                </div>
              )}
            </section>

          </div>

        </div>
      </main>
    </div>
  );
}
