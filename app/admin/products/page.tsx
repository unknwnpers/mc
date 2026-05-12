"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/firebase";
import { validateImageFile } from "@/lib/storage";
import {
  Package, Plus, Pencil, Archive, RefreshCw, X, Save,
  Check, Loader2, Image as ImageIcon, Trash2, GripVertical, ChevronRight,
  AlertTriangle, Upload, FileSpreadsheet, Search, Filter, ArrowUpDown,
  LayoutGrid, List, Download
} from "lucide-react";
import type { ProductVariant, ProductOption } from "@/lib/types";
import { parseExcelFile, ParsedProduct, ImportResult, DuplicateEntry, SizeIssue } from "@/lib/excel-import";

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
  rating?: number;
  reviewCount?: number;
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
  { label: "Maternity Wear", value: "maternity-wear" },
  { label: "Kids Clothing", value: "kids-clothing" },
  { label: "Baby Essentials", value: "baby-essentials" },
  { label: "Feeding & Nursing", value: "feeding-nursing" },
  { label: "Accessories", value: "accessories" },
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

  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [stockEdit, setStockEdit] = useState<{ productId: string; sku: string; stock: number } | null>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ productId: string; productName: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<ImageUploadPreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Import State ──────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSizeIssuesModal, setShowSizeIssuesModal] = useState(false);
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null);
  const [sizeFixStrategy, setSizeFixStrategy] = useState<'convert' | 'skip' | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // ── Search & Filter State ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "price">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // ── Bulk Operations State ─────────────────────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{ action: string; count: number } | null>(null);

  // ── Pagination State ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const res = await adminFetch(`/api/admin/products?includeArchived=true&_t=${Date.now()}`);
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error("Server returned invalid response. Please check API endpoint.");
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products || []);
    } catch (e: any) {
      toast.error(e.message || "Could not load products");
    } finally { setFetching(false); }
  }, [user, isAdmin]);

  useEffect(() => { if (!loading && isAdmin) fetchProducts(); }, [loading, isAdmin, fetchProducts]);

  // ── Filter & Sort Logic ───────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category_slug.toLowerCase().includes(query) ||
        p.variants.some(v => v.sku.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(p => p.category_slug === categoryFilter);
    }

    // Stock filter
    if (stockFilter !== "all") {
      result = result.filter(p => {
        const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
        const hasOutOfStock = p.variants.some(v => v.stock === 0);
        const hasLowStock = p.variants.some(v => v.stock > 0 && v.stock <= 5);
        
        switch (stockFilter) {
          case "in_stock": return totalStock > 0;
          case "out_of_stock": return hasOutOfStock;
          case "low_stock": return hasLowStock;
          default: return true;
        }
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(p => {
        if (statusFilter === "active") return p.isActive;
        if (statusFilter === "archived") return !p.isActive;
        if (statusFilter === "featured") return p.is_featured;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
          break;
        case "price":
          const aPrice = a.variants[0]?.price || 0;
          const bPrice = b.variants[0]?.price || 0;
          comparison = aPrice - bPrice;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter, sortBy, sortOrder]);

  // ── Pagination Logic ──────────────────────────────────────────────────────
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter, statusFilter]);

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
      name: p.name,
      description: p.description || "",
      imageInput: "",
      images: p.images || [],
      category_slug: p.category_slug || "",
      is_featured: p.is_featured || false,
      isActive: p.isActive !== false,
      sizeInput: "",
      variants: p.variants || [],
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

    // Validate files before adding to previews
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name}: ${validation.error}`);
      }
    }

    if (validFiles.length === 0) return;

    const newPreviews: ImageUploadPreview[] = validFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);
    toast.info(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} selected for upload`);

    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePreview(id: string) {
    setImagePreviews(prev => {
      const preview = prev.find(p => p.id === id);
      if (preview) {
        URL.revokeObjectURL(preview.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  }

  async function uploadImages(): Promise<string[]> {
    if (imagePreviews.length === 0) {
      return form.images;
    }

    const uploadedUrls: string[] = [];
    const total = imagePreviews.length;
    
    // Use temp ID for new products, or existing product ID
    const productId = editing?.id || `temp_${Date.now()}`;

    for (let i = 0; i < imagePreviews.length; i++) {
      const preview = imagePreviews[i];
      try {
        toast.info(`Uploading image ${i + 1} of ${total}...`);
        
        // Use server-side API with App Check
        const formData = new FormData();
        formData.append('file', preview.file);
        formData.append('productId', productId);
        formData.append('variant', 'original');

        const response = await apiFetch('/api/admin/products/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }
        
        console.log('[Upload] Image uploaded successfully:', data.url);
        uploadedUrls.push(data.url);
        URL.revokeObjectURL(preview.preview);
      } catch (error: any) {
        console.error('[Upload] Failed:', error);
        toast.error(`Failed to upload ${preview.file.name}: ${error.message}`);
      }
    }

    // Clear previews after upload
    setImagePreviews([]);

    const finalUrls = [...form.images, ...uploadedUrls];
    console.log('[Upload] Final images array:', finalUrls);
    // Combine existing URL images with newly uploaded ones
    return finalUrls;
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

  // ── Import helpers ────────────────────────────────────────────────────────
  async function handleExcelSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setImportFile(file);
    const result = await parseExcelFile(file);
    setImportPreview(result);

    if (!result.success) {
      toast.error(`Import validation failed: ${result.errors.length} errors`);
    } else if (result.sizeIssues.length > 0) {
      // Show size issues modal first (before duplicates)
      setPendingImport(result);
      setShowSizeIssuesModal(true);
      toast.warning(`${result.sizeIssues.length} invalid size entries detected`);
    } else if (result.duplicates.length > 0) {
      // Show duplicate confirmation modal
      setPendingImport(result);
      setShowDuplicateModal(true);
      toast.warning(`${result.duplicates.length} duplicate entries detected`);
    } else if (result.warnings.length > 0) {
      toast.warning(`Import ready with ${result.warnings.length} warnings`);
    } else {
      toast.success(`Import ready: ${result.products.length} products`);
    }
  }

  async function executeImport(mergeDuplicates = false, sizeFix: 'convert' | 'skip' | null = null) {
    if (!importPreview?.success && !pendingImport?.success) return;
    
    const importData = (mergeDuplicates || sizeFix) && pendingImport ? pendingImport : importPreview;
    if (!importData || (importData.products.length === 0 && sizeFix !== 'skip')) return;

    setImporting(true);
    try {
      const res = await adminFetch('/api/admin/products/import', {
        method: 'POST',
        body: JSON.stringify({ 
          products: importData.products,
          mergeDuplicates,
          sizeFix,
          sizeIssues: importData.sizeIssues
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      const summaryParts = [`${data.results.created} created`, `${data.results.updated} updated`];
      if (data.results.converted > 0) summaryParts.push(`${data.results.converted} converted`);
      if (data.results.skipped > 0) summaryParts.push(`${data.results.skipped} skipped`);
      
      toast.success(`Import complete: ${summaryParts.join(', ')}`);
      
      if (data.results.errors.length > 0) {
        data.results.errors.forEach((err: string) => toast.error(err));
      }

      // Reset and refresh
      setShowImport(false);
      setShowDuplicateModal(false);
      setShowSizeIssuesModal(false);
      setImportFile(null);
      setImportPreview(null);
      setPendingImport(null);
      setSizeFixStrategy(null);
      if (excelInputRef.current) excelInputRef.current.value = '';
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const csv = 'Product Name,Category,Size,Price,Stock,Image URL\n' +
                'Organic Cotton Onesie,baby-essentials,0-3M,599,50,https://example.com/image1.jpg\n' +
                'Organic Cotton Onesie,baby-essentials,3-6M,599,30,\n' +
                'Maternity Dress,maternity-wear,M,1299,20,https://example.com/image2.jpg';
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
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
        console.log('[Save] Images after upload:', finalImages);
      } catch (err) {
        console.error('[Save] Image upload failed:', err);
        toast.error('Image upload failed. Using URL images only.');
      }
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description,
        images: finalImages,
        category_slug: form.category_slug,
        is_featured: form.is_featured,
        isActive: form.isActive,
        options: [{ name: "Size", values: form.variants.map(v => v.sku) }],
        variants: form.variants,
      };
      console.log('[Save] Saving product with body:', body);

      const res = editing
        ? await adminFetch(`/api/admin/products/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await adminFetch("/api/admin/products", { method: "POST", body: JSON.stringify(body) });

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
      const res = await adminFetch("/api/admin/products", { method: "DELETE", body: JSON.stringify({ id, action: "archive" }) });
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
      const res = await adminFetch("/api/admin/inventory", {
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

  // ── Bulk Operations ───────────────────────────────────────────────────────
  function toggleProductSelection(id: string) {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAllProducts() {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  }

  async function executeBulkAction(action: string) {
    if (selectedProducts.size === 0) return;
    setBulkActionLoading(true);
    
    try {
      const ids = Array.from(selectedProducts);
      const res = await adminFetch("/api/admin/products/bulk", {
        method: "POST",
        body: JSON.stringify({ action, ids }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`${action.replace("_", " ")} completed for ${ids.length} products`);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Bulk action failed");
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirm(null);
    }
  }

  // ── Export Products ───────────────────────────────────────────────────────
  function exportProducts() {
    const productsToExport = filteredProducts.length > 0 ? filteredProducts : products;
    
    // Create CSV content
    const headers = ["Product Name", "Category", "Size", "Price", "Stock", "Status", "Featured", "Image URL"];
    const rows: string[] = [];
    
    productsToExport.forEach(p => {
      const baseRow = [
        p.name,
        p.category_slug,
        "",
        "",
        "",
        p.isActive ? "Active" : "Archived",
        p.is_featured ? "Yes" : "No",
        p.images?.[0] || ""
      ];
      
      if (p.variants.length === 0) {
        rows.push(baseRow.join(","));
      } else {
        p.variants.forEach(v => {
          const variantRow = [
            p.name,
            p.category_slug,
            (v as any).options?.Size || v.sku,
            v.price.toString(),
            v.stock.toString(),
            p.isActive ? "Active" : "Archived",
            p.is_featured ? "Yes" : "No",
            p.images?.[0] || ""
          ];
          rows.push(variantRow.join(","));
        });
      }
    });
    
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${productsToExport.length} products`);
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Products</h1>
              <p className="text-white/40 text-sm">{filteredProducts.filter(p => p.isActive).length} of {products.length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchProducts} disabled={fetching}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-40">
              <RefreshCw className={cn("w-4 h-4 text-white/60", fetching && "animate-spin")} />
            </button>
            <button onClick={exportProducts}
              className="flex items-center gap-2 bg-white/5 text-white border border-white/10 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-all">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/90 transition-all">
              <Plus className="w-4 h-4" /> New Product
            </button>
          </div>
        </div>

        {/* ── Search & Filters ─────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search products, categories, sizes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
              >
                <option value="all" className="bg-[#111]">All Categories</option>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value} className="bg-[#111]">{c.label}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
              >
                <option value="all" className="bg-[#111]">All Stock</option>
                <option value="in_stock" className="bg-[#111]">In Stock</option>
                <option value="low_stock" className="bg-[#111]">Low Stock (≤5)</option>
                <option value="out_of_stock" className="bg-[#111]">Out of Stock</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 appearance-none min-w-[120px]"
              >
                <option value="all" className="bg-[#111]">All Status</option>
                <option value="active" className="bg-[#111]">Active</option>
                <option value="archived" className="bg-[#111]">Archived</option>
                <option value="featured" className="bg-[#111]">Featured</option>
              </select>

              {/* Sort */}
              <button
                onClick={() => {
                  if (sortBy === "name") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("name");
                    setSortOrder("asc");
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all",
                  sortBy === "name"
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>

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
                  "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm transition-all",
                  sortBy === "date"
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}
              </button>

              {/* View Toggle */}
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "grid" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === "list" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <span className="text-white/40 text-xs">Active filters:</span>
              {searchQuery && (
                <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  Search: "{searchQuery}" <button onClick={() => setSearchQuery("")} className="hover:text-red-400">×</button>
                </span>
              )}
              {categoryFilter !== "all" && (
                <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  {CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label}
                  <button onClick={() => setCategoryFilter("all")} className="hover:text-red-400">×</button>
                </span>
              )}
              {stockFilter !== "all" && (
                <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  {stockFilter.replace("_", " ")}
                  <button onClick={() => setStockFilter("all")} className="hover:text-red-400">×</button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="text-xs bg-white/10 text-white px-2 py-1 rounded-full flex items-center gap-1">
                  {statusFilter}
                  <button onClick={() => setStatusFilter("all")} className="hover:text-red-400">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setStockFilter("all"); setStatusFilter("all"); }}
                className="text-xs text-white/40 hover:text-white ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Bulk Action Bar ────────────────────────────────────────────── */}
        {selectedProducts.size > 0 && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium">
                {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkConfirm({ action: "archive", count: selectedProducts.size })}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
              <button
                onClick={() => setShowBulkConfirm({ action: "restore", count: selectedProducts.size })}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restore
              </button>
              <button
                onClick={() => setShowBulkConfirm({ action: "delete", count: selectedProducts.size })}
                disabled={bulkActionLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <button
                onClick={() => setSelectedProducts(new Set())}
                className="px-3 py-2 text-white/60 text-sm hover:text-white transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Product Grid ────────────────────────────────────────────────── */}
        {fetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white/3 rounded-2xl border border-white/10 border-dashed">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-sm">
              {products.length === 0 ? "No products yet. Create your first one!" : "No products match your filters."}
            </p>
            {products.length > 0 && (
              <button
                onClick={() => { setSearchQuery(""); setCategoryFilter("all"); setStockFilter("all"); setStatusFilter("all"); }}
                className="text-white/60 hover:text-white text-sm mt-2 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ── List View ───────────────────────────────────────────────────── */
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[40px_auto_1fr_120px_100px_100px_100px_120px] gap-4 px-4 py-3 border-b border-white/10 text-xs font-bold text-white/30 uppercase tracking-widest items-center">
              <input
                type="checkbox"
                checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id))}
                onChange={selectAllProducts}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-0 focus:ring-offset-0"
              />
              <div className="w-12">Image</div>
              <div>Product</div>
              <div>Category</div>
              <div>Stock</div>
              <div>Rating</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-white/5">
              {paginatedProducts.map(p => {
                const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                const hasOutOfStock = p.variants.some(v => v.stock === 0);
                const hasLowStock = p.variants.some(v => v.stock > 0 && v.stock <= 5);
                return (
                  <div key={p.id} className={cn(
                    "grid grid-cols-[40px_auto_1fr_120px_100px_100px_100px_120px] gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors",
                    !p.isActive && "opacity-50",
                    selectedProducts.has(p.id) && "bg-white/5"
                  )}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(p.id)}
                      onChange={() => toggleProductSelection(p.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-0 focus:ring-offset-0"
                    />
                    <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm truncate">{p.name}</p>
                      <p className="text-white/40 text-xs">{p.variants.length} variant(s)</p>
                    </div>
                    <div className="text-white/60 text-xs">{p.category_slug.replace(/-/g, " ")}</div>
                    <div>
                      {hasOutOfStock ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Out of Stock</span>
                      ) : hasLowStock ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Low Stock</span>
                      ) : (
                        <span className="text-white/60 text-xs">{totalStock} in stock</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span className="text-white text-xs">{p.rating || 0}</span>
                      <span className="text-white/30 text-[10px]">({p.reviewCount || 0})</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {!p.isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Archived</span>}
                      {p.is_featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Featured</span>}
                      {p.isActive && !p.is_featured && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Active</span>}
                    </div>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <Pencil className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      {p.isActive && (
                        <>
                          <button onClick={() => setDeleteConfirm({ productId: p.id, productName: p.name })}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all">
                            <Trash2 className="w-3.5 h-3.5 text-red-400/80" />
                          </button>
                          <button onClick={() => archiveProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all">
                            <Archive className="w-3.5 h-3.5 text-amber-400/80" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Grid View ───────────────────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedProducts.map(p => (
              <div key={p.id} className={cn(
                "bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all group relative",
                !p.isActive && "opacity-40",
                selectedProducts.has(p.id) && "border-white/30 bg-white/5"
              )}>
                {/* Checkbox */}
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(p.id)}
                    onChange={() => toggleProductSelection(p.id)}
                    className="w-5 h-5 rounded border-white/30 bg-black/50 text-white focus:ring-0 focus:ring-offset-0"
                  />
                </div>
                {/* Image */}
                <div className="h-40 bg-white/5 flex items-center justify-center overflow-hidden">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <ImageIcon className="w-8 h-8 text-white/20" />
                  }
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white truncate">{p.name}</h3>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      {!p.isActive && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">Archived</span>}
                      {p.is_featured && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">Featured</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={cn("w-3 h-3", i <= Math.round(p.rating || 0) ? "text-amber-400 fill-current" : "text-white/10")} />
                      ))}
                    </div>
                    <span className="text-[10px] text-white/40">({p.reviewCount || 0} reviews)</span>
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
                          {(v as any).options?.Size || v.sku} · ₹{v.price} · {v.stock === 0 ? "OOS" : `${v.stock}`}
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

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-white/40 text-sm">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                    }
                    if (currentPage > totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-9 w-9 rounded-xl text-sm font-medium transition-all",
                        currentPage === pageNum
                          ? "bg-white text-black"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
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
                className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ── Bulk Confirm Modal ─────────────────────────────────────────── */}
        {showBulkConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className={cn(
                  "w-6 h-6",
                  showBulkConfirm.action === "delete" ? "text-red-400" : "text-amber-400"
                )} />
                <h2 className="text-lg font-bold text-white">
                  Confirm {showBulkConfirm.action.replace("_", " ")}
                </h2>
              </div>
              <p className="text-white/60 text-sm mb-6">
                Are you sure you want to {showBulkConfirm.action.replace("_", " ")} {showBulkConfirm.count} product{showBulkConfirm.count !== 1 ? "s" : ""}?
                {showBulkConfirm.action === "delete" && " This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkConfirm(null)}
                  disabled={bulkActionLoading}
                  className="flex-1 bg-white/5 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeBulkAction(showBulkConfirm.action)}
                  disabled={bulkActionLoading}
                  className={cn(
                    "flex-1 text-white font-medium py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50",
                    showBulkConfirm.action === "delete" ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            </div>
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

        {/* ── Import Modal ──────────────────────────────────────────────────── */}
        {showImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blush" />
                  <h2 className="text-lg font-bold text-white">Bulk Import Products</h2>
                </div>
                <button onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); }}
                  className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {!importPreview ? (
                  <div className="space-y-6">
                    {/* Upload Area */}
                    <div 
                      onClick={() => excelInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <Upload className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">Click to upload Excel file</p>
                      <p className="text-white/40 text-sm">.xlsx or .xls format</p>
                    </div>
                    <input 
                      ref={excelInputRef}
                      type="file" 
                      accept=".xlsx,.xls" 
                      onChange={handleExcelSelect}
                      className="hidden"
                    />

                    {/* Template Download */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-white/60 text-sm mb-3">Required columns:</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {['Product Name', 'Category', 'Size', 'Price', 'Stock'].map(col => (
                          <span key={col} className="text-xs bg-white/10 text-white/80 px-2 py-1 rounded">{col}</span>
                        ))}
                        <span className="text-xs bg-white/5 text-white/40 px-2 py-1 rounded">Image URL (optional)</span>
                      </div>
                      <button onClick={downloadTemplate}
                        className="text-sm text-blush hover:text-white transition-colors flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> Download Template
                      </button>
                    </div>

                    {/* Category Reference */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-white/60 text-sm mb-3">Valid categories:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {CATEGORY_OPTIONS.map(cat => (
                          <div key={cat.value} className="flex justify-between text-white/80">
                            <span>{cat.label}</span>
                            <span className="text-white/40">{cat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Preview Results */}
                    <div className={cn(
                      "rounded-xl p-4 border",
                      importPreview.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        {importPreview.success ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={cn("font-medium", importPreview.success ? "text-green-400" : "text-red-400")}>
                          {importPreview.success ? 'Ready to Import' : 'Validation Failed'}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">
                        {importPreview.products.length} products • {importPreview.totalVariants} total variants
                      </p>
                    </div>

                    {/* Errors */}
                    {importPreview.errors.length > 0 && (
                      <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 max-h-40 overflow-auto">
                        <p className="text-red-400 text-sm font-medium mb-2">Errors ({importPreview.errors.length}):</p>
                        {importPreview.errors.map((err, i) => (
                          <p key={i} className="text-red-300/80 text-xs mb-1">• {err}</p>
                        ))}
                      </div>
                    )}

                    {/* Warnings */}
                    {importPreview.warnings.length > 0 && (
                      <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/10 max-h-32 overflow-auto">
                        <p className="text-yellow-400 text-sm font-medium mb-2">Warnings ({importPreview.warnings.length}):</p>
                        {importPreview.warnings.map((warn, i) => (
                          <p key={i} className="text-yellow-300/80 text-xs mb-1">• {warn}</p>
                        ))}
                      </div>
                    )}

                    {/* Product Preview */}
                    {importPreview.products.length > 0 && (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 max-h-60 overflow-auto">
                        <p className="text-white/60 text-sm font-medium mb-3">Products to import:</p>
                        {importPreview.products.map((p, i) => (
                          <div key={i} className="mb-3 pb-3 border-b border-white/5 last:border-0">
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-white/40 text-xs">{p.category_slug} • {p.variants.length} variant(s)</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-5 border-t border-white/10">
                <button 
                  onClick={() => { setShowImport(false); setImportFile(null); setImportPreview(null); }}
                  className="flex-1 bg-white/5 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-all text-sm"
                >
                  Cancel
                </button>
                {importPreview?.success && importPreview.duplicates.length === 0 && (
                  <button 
                    onClick={() => executeImport(false)}
                    disabled={importing}
                    className="flex-1 bg-blush text-white font-medium py-3 rounded-xl hover:bg-blush/90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {importing ? 'Importing...' : `Import ${importPreview.products.length} Products`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Duplicate Confirmation Modal ─────────────────────────────────── */}
        {showDuplicateModal && pendingImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Duplicate Sizes Detected</h2>
                  <p className="text-white/40 text-sm">{pendingImport.duplicates.length} duplicate entries found</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <p className="text-white/60 text-sm mb-4">
                  The following products have duplicate size entries. How would you like to handle them?
                </p>

                {/* Duplicate List */}
                <div className="space-y-3 mb-6">
                  {pendingImport.duplicates.slice(0, 5).map((dup, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{dup.productName}</span>
                        <span className="text-white/40 text-xs">Size: {dup.size}</span>
                      </div>
                      <div className="text-white/40 text-xs">
                        Rows: {dup.rows.join(', ')} • 
                        {dup.hasPriceConflict ? (
                          <span className="text-red-400">Price conflict: ₹{dup.prices.join(' vs ₹')}</span>
                        ) : (
                          <span>₹{dup.prices[0]} each</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingImport.duplicates.length > 5 && (
                    <p className="text-white/40 text-xs text-center">
                      ... and {pendingImport.duplicates.length - 5} more
                    </p>
                  )}
                </div>

                {/* Price Conflict Warning */}
                {pendingImport.duplicates.some(d => d.hasPriceConflict) && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                    <p className="text-red-400 text-sm font-medium mb-1">⚠️ Price Conflicts Detected</p>
                    <p className="text-red-300/80 text-xs">
                      Some duplicates have different prices. Merging will use the first price encountered.
                    </p>
                  </div>
                )}

                {/* Options */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-3">Choose an action:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-3 text-white/80">
                      <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                      <div>
                        <span className="font-medium text-white">Merge Automatically</span>
                        <p className="text-white/40 text-xs">Combine stock quantities, keep first price</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-white/80">
                      <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-white/40" />
                      </div>
                      <div>
                        <span className="font-medium text-white">Cancel Upload</span>
                        <p className="text-white/40 text-xs">Fix duplicates in Excel and re-upload</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-5 border-t border-white/10">
                <button 
                  onClick={() => { setShowDuplicateModal(false); setPendingImport(null); }}
                  className="flex-1 bg-white/5 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-all text-sm"
                >
                  Cancel Upload
                </button>
                <button 
                  onClick={() => executeImport(true, sizeFixStrategy)}
                  disabled={importing}
                  className="flex-1 bg-green-500 text-white font-medium py-3 rounded-xl hover:bg-green-500/90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {importing ? 'Merging...' : sizeFixStrategy ? `Merge & ${sizeFixStrategy === 'convert' ? 'Convert' : 'Skip'}` : 'Merge & Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Size Issues Modal ────────────────────────────────────────────── */}
        {showSizeIssuesModal && pendingImport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Invalid Sizes Detected</h2>
                  <p className="text-white/40 text-sm">{pendingImport.sizeIssues.length} rows with size issues</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                <p className="text-white/60 text-sm mb-4">
                  Some products have sizes that don't match their category. How would you like to handle them?
                </p>

                {/* Issues List */}
                <div className="space-y-3 mb-6">
                  {pendingImport.sizeIssues.slice(0, 5).map((issue, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium text-sm">{issue.productName}</span>
                        <span className="text-orange-400 text-xs">{issue.size}</span>
                      </div>
                      <div className="text-white/40 text-xs">
                        Row {issue.row} • {issue.category}
                        {issue.suggestedFix && (
                          <span className="text-green-400 ml-2">→ Suggest: {issue.suggestedFix}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingImport.sizeIssues.length > 5 && (
                    <p className="text-white/40 text-xs text-center">
                      ... and {pendingImport.sizeIssues.length - 5} more
                    </p>
                  )}
                </div>

                {/* Valid Sizes Reference */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
                  <p className="text-white/60 text-sm mb-2">Valid sizes by category:</p>
                  <div className="space-y-1 text-xs text-white/40">
                    <div><span className="text-white/60">Baby Essentials:</span> 0-3M, 3-6M, 6-9M, 9-12M, 12-18M, 18-24M</div>
                    <div><span className="text-white/60">Kids Clothing:</span> 1-2Y, 2-3Y, 3-4Y, 4-5Y, 5-6Y, 6-7Y, 7-8Y, 8-9Y, 9-10Y, 10-12Y, 12-14Y</div>
                    <div><span className="text-white/60">Maternity Wear:</span> S, M, L, XL, XXL, Free Size</div>
                    <div><span className="text-white/60">Accessories:</span> Free Size</div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <span className="font-medium text-white">Convert Automatically</span>
                      <p className="text-white/40 text-xs">Map invalid sizes to valid ones (S→0-3M, M→3-6M, etc.)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-white/40" />
                    </div>
                    <div>
                      <span className="font-medium text-white">Skip Invalid Rows</span>
                      <p className="text-white/40 text-xs">Import only valid rows, skip problematic ones</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-6 py-5 border-t border-white/10">
                <button 
                  onClick={() => { setShowSizeIssuesModal(false); setPendingImport(null); setSizeFixStrategy(null); }}
                  className="flex-1 bg-white/5 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-all text-sm"
                >
                  Cancel Import
                </button>
                <button 
                  onClick={() => {
                    setSizeFixStrategy('skip');
                    // Check for duplicates after size fix decision
                    if (pendingImport.duplicates.length > 0) {
                      setShowSizeIssuesModal(false);
                      setShowDuplicateModal(true);
                    } else {
                      executeImport(false, 'skip');
                    }
                  }}
                  disabled={importing}
                  className="flex-1 bg-white/10 text-white font-medium py-3 rounded-xl hover:bg-white/20 transition-all text-sm"
                >
                  Skip & Continue
                </button>
                <button 
                  onClick={() => {
                    setSizeFixStrategy('convert');
                    // Check for duplicates after size fix decision
                    if (pendingImport.duplicates.length > 0) {
                      setShowSizeIssuesModal(false);
                      setShowDuplicateModal(true);
                    } else {
                      executeImport(false, 'convert');
                    }
                  }}
                  disabled={importing}
                  className="flex-1 bg-green-500 text-white font-medium py-3 rounded-xl hover:bg-green-500/90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Convert
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
                    <p className="text-white/30 text-[10px] mt-1.5">JPEG, PNG, WebP up to 5MB each</p>
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
                      { label: "Active (visible in store)", key: "isActive" as const },
                      { label: "Featured on homepage", key: "is_featured" as const },
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
                          <span className="text-sm font-bold text-white font-mono">{(v as any).options?.Size || v.sku}</span>
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
