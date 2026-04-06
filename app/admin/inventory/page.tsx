"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Archive, RefreshCw, Minus, Plus, Check, AlertTriangle, Search, Filter, X, Package, Trash2, History, Download, Upload } from "lucide-react";

interface InventoryLog {
  id: string;
  action: string;
  previousStock: number;
  newStock: number;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

type Variant = { sku: string; price: number; stock: number; reservedStock?: number; options?: Record<string, string> };
interface Product { id: string; name: string; variants: Variant[]; images: string[]; isActive: boolean; lowStockThreshold?: number; }

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
}

export default function InventoryPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [edits,    setEdits]      = useState<Record<string, Record<string, number>>>({});  // { productId: { size: newStock } }
  const [saving,   setSaving]     = useState<string | null>(null);  // "productId:size"
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  
  // Bulk selection states
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set()); // "productId:sku"
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"set" | "adjust">("set");
  const [bulkValue, setBulkValue] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  
  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historySku, setHistorySku] = useState<string>("");
  const [historyLogs, setHistoryLogs] = useState<InventoryLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setFetching(true);
    try {
      const res  = await adminFetch("/api/admin/products?includeArchived=false");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  function getStock(productId: string, sku: string, base: number) {
    return edits[productId]?.[sku] ?? base;
  }

  function adjust(productId: string, sku: string, base: number, delta: number) {
    const current = getStock(productId, sku, base);
    const next = Math.max(0, current + delta);
    setEdits(prev => ({ ...prev, [productId]: { ...prev[productId], [sku]: next } }));
  }

  function setDirect(productId: string, sku: string, val: string) {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setEdits(prev => ({ ...prev, [productId]: { ...prev[productId], [sku]: num } }));
  }

  async function saveStock(productId: string, sku: string, stock: number) {
    const key = `${productId}:${sku}`;
    setSaving(key);
    try {
      const res  = await adminFetch("/api/admin/inventory", { method: "POST", body: JSON.stringify({ productId, sku, stock }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${sku} stock updated → ${stock}`);
      // Clear the local edit
      setEdits(prev => { const n = { ...prev }; delete n[productId]?.[sku]; return n; });
      fetchProducts();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(null); }
  }

  // Bulk selection helpers
  const toggleVariantSelection = (productId: string, sku: string) => {
    const key = `${productId}:${sku}`;
    setSelectedVariants(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    const allVisible = filteredProducts.flatMap(p => 
      (p.variants || []).map(v => `${p.id}:${v.sku}`)
    );
    setSelectedVariants(new Set(allVisible));
  };

  const clearSelection = () => {
    setSelectedVariants(new Set());
  };

  const executeBulkUpdate = async () => {
    const value = parseInt(bulkValue, 10);
    if (isNaN(value)) {
      toast.error("Please enter a valid number");
      return;
    }

    setIsBulkSaving(true);
    const updates = Array.from(selectedVariants).map(key => {
      const [productId, sku] = key.split(":");
      const product = products.find(p => p.id === productId);
      const variant = product?.variants?.find(v => v.sku === sku);
      if (!variant) return null;

      const newStock = bulkAction === "set" 
        ? Math.max(0, value)
        : Math.max(0, variant.stock + value);
      
      return { productId, sku, stock: newStock };
    }).filter(Boolean);

    try {
      const res = await adminFetch("/api/admin/inventory/bulk", {
        method: "POST",
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Updated ${updates.length} variants`);
      setShowBulkModal(false);
      setSelectedVariants(new Set());
      setBulkValue("");
      fetchProducts();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Fetch stock history for a variant
  const fetchHistory = async (product: Product, sku: string) => {
    setHistoryProduct(product);
    setHistorySku(sku);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await adminFetch(`/api/admin/inventory/history?productId=${product.id}&sku=${sku}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setHistoryLogs(data.logs || []);
      } else {
        toast.error(data.error || "Failed to fetch history");
      }
    } catch (e: any) {
      toast.error("Failed to fetch history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper to get threshold for a product
  const getThreshold = (product: Product) => product.lowStockThreshold ?? 3;

  const allLowStock = products.flatMap(p =>
    (p.variants || []).filter(v => {
      const threshold = getThreshold(p);
      return v.stock > 0 && v.stock <= threshold;
    }).map(v => ({ name: p.name, sku: v.sku, threshold: getThreshold(p) }))
  );

  // Filter products based on search and stock filter
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.variants?.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;
      
      // Stock filter
      if (stockFilter === "all") return true;
      
      const variants = product.variants || [];
      const threshold = getThreshold(product);
      if (variants.length === 0) return stockFilter === "out-of-stock";
      
      switch (stockFilter) {
        case "in-stock":
          return variants.some(v => v.stock > threshold);
        case "low-stock":
          return variants.some(v => v.stock > 0 && v.stock <= threshold);
        case "out-of-stock":
          return variants.some(v => v.stock === 0);
        default:
          return true;
      }
    });
  }, [products, searchQuery, stockFilter]);

  // Count products by status
  const productCounts = useMemo(() => {
    return {
      all: products.length,
      "in-stock": products.filter(p => (p.variants || []).some(v => v.stock > getThreshold(p))).length,
      "low-stock": products.filter(p => (p.variants || []).some(v => v.stock > 0 && v.stock <= getThreshold(p))).length,
      "out-of-stock": products.filter(p => (p.variants || []).every(v => v.stock === 0) || (p.variants || []).length === 0).length,
    };
  }, [products]);

  const clearFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
  };

  const hasActiveFilters = searchQuery || stockFilter !== "all";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Inventory</h1>
          <p className="text-white/30 text-sm mt-1">Click +/− or type to edit stock, then ✓ to save</p>
        </div>
        <button onClick={fetchProducts} disabled={fetching}
          className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white transition-all border border-white/[0.06]">
          <RefreshCw className={cn("w-5 h-5", fetching && "animate-spin")} />
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Stock Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="pl-10 pr-8 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All ({productCounts.all})</option>
            <option value="in-stock">In Stock ({productCounts["in-stock"]})</option>
            <option value="low-stock">Low Stock ({productCounts["low-stock"]})</option>
            <option value="out-of-stock">Out of Stock ({productCounts["out-of-stock"]})</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-3 text-sm text-white/50 hover:text-white/80 transition-colors border border-white/[0.06] rounded-xl hover:bg-white/[0.03]"
          >
            Clear
          </button>
        )}
        
        {/* Export Button */}
        <button
          onClick={async () => {
            try {
              const res = await adminFetch("/api/admin/inventory/export");
              if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success("Inventory exported");
              } else {
                toast.error("Failed to export");
              }
            } catch (e) {
              toast.error("Failed to export");
            }
          }}
          className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 rounded-xl transition-colors border border-white/[0.06]"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        
        {/* Import Button */}
        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 rounded-xl transition-colors border border-white/[0.06]"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="mb-4 text-sm text-white/40">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      )}

      {/* Low Stock Alert */}
      {allLowStock.length > 0 && stockFilter !== "out-of-stock" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-bold text-sm">Low Stock Warning</p>
            <p className="text-amber-400/70 text-xs mt-1">
              {allLowStock.map(i => `${i.name} (${i.sku})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Bulk Selection Bar */}
      {selectedVariants.size > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-sm">
              {selectedVariants.size} variant{selectedVariants.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-bold transition-colors"
            >
              Bulk Update
            </button>
            <button
              onClick={clearSelection}
              className="p-2 text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {fetching ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24 text-white/20 font-semibold">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-50" />
          {hasActiveFilters ? "No products match your filters" : "No active products found"}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Product Header */}
              <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04]">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-white/5" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Archive className="w-4 h-4 text-white/20" />
                  </div>
                )}
                <h3 className="text-white font-black flex-1">{p.name}</h3>
                
                {/* Low Stock Threshold Badge */}
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-xs text-white/30">Low stock at:</span>
                  <select
                    value={p.lowStockThreshold ?? 3}
                    onChange={async (e) => {
                      const newThreshold = parseInt(e.target.value, 10);
                      try {
                        const res = await adminFetch(`/api/admin/products/${p.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ lowStockThreshold: newThreshold }),
                        });
                        if (res.ok) {
                          setProducts(prev => prev.map(prod => 
                            prod.id === p.id ? { ...prod, lowStockThreshold: newThreshold } : prod
                          ));
                          toast.success(`Threshold updated to ${newThreshold}`);
                        }
                      } catch (e) {
                        toast.error("Failed to update threshold");
                      }
                    }}
                    className="px-2 py-1 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-white focus:outline-none focus:border-white/20 cursor-pointer"
                  >
                    {[1, 2, 3, 5, 10, 20].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                
                <span className="text-white/20 text-xs font-mono">{p.id.slice(0, 10)}…</span>
                {/* Select All for this product */}
                {p.variants && p.variants.length > 0 && (
                  <button
                    onClick={() => {
                      const allSelected = p.variants!.every(v => selectedVariants.has(`${p.id}:${v.sku}`));
                      if (allSelected) {
                        // Deselect all for this product
                        setSelectedVariants(prev => {
                          const next = new Set(prev);
                          p.variants!.forEach(v => next.delete(`${p.id}:${v.sku}`));
                          return next;
                        });
                      } else {
                        // Select all for this product
                        setSelectedVariants(prev => {
                          const next = new Set(prev);
                          p.variants!.forEach(v => next.add(`${p.id}:${v.sku}`));
                          return next;
                        });
                      }
                    }}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    {p.variants.every(v => selectedVariants.has(`${p.id}:${v.sku}`)) ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {/* Variant Stock Controls */}
              {!(p.variants && p.variants.length > 0) ? (
                <p className="px-6 py-4 text-white/20 text-sm">No variants configured</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
                  {p.variants.map((v) => {
                    const sku = v.sku;
                    const currentStock = getStock(p.id, sku, v.stock);
                    const dirty        = edits[p.id]?.[sku] !== undefined && edits[p.id][sku] !== v.stock;
                    const key          = `${p.id}:${sku}`;
                    const threshold    = getThreshold(p);
                    const stockColor   = currentStock === 0 ? "text-red-400" : currentStock <= threshold ? "text-amber-400" : "text-emerald-400";

                    const isSelected = selectedVariants.has(key);

                    return (
                      <div key={sku} className={cn(
                        "bg-white/[0.03] rounded-xl p-3 border transition-all relative",
                        dirty ? "border-white/20" : "border-white/[0.04]",
                        isSelected && "border-emerald-500/30 bg-emerald-500/5"
                      )}>
                        {/* Selection Checkbox */}
                        <label className="absolute top-2 right-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleVariantSelection(p.id, sku)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                          />
                        </label>
                        <div className="flex items-center justify-between mb-2 pr-6">
                          <span className="text-white font-black text-sm">{sku}</span>
                          <span className="text-white/30 text-[10px]">₹{v.price}</span>
                        </div>

                        {/* Stock adjuster */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <button onClick={() => adjust(p.id, sku, v.stock, -1)}
                            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input type="number" min={0} value={currentStock}
                            onChange={e => setDirect(p.id, sku, e.target.value)}
                            className="flex-1 bg-transparent text-center text-sm font-black text-white focus:outline-none w-0" />
                          <button onClick={() => adjust(p.id, sku, v.stock, 1)}
                            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Stock Info */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[10px] font-black uppercase", stockColor)}>
                              {currentStock === 0 ? "OOS" : `${currentStock} physical`}
                            </span>
                          </div>
                          {v.reservedStock ? (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-amber-400/70">{v.reservedStock} reserved</span>
                              <span className="text-emerald-400/70">{currentStock - (v.reservedStock || 0)} available</span>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {/* History Button */}
                            <button
                              onClick={() => fetchHistory(p, sku)}
                              className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/10 text-white/30 hover:text-white/60 flex items-center justify-center transition-all"
                              title="View history"
                            >
                              <History className="w-3 h-3" />
                            </button>
                            {dirty && (
                              <button onClick={() => saveStock(p.id, sku, currentStock)}
                                disabled={saving === key}
                                className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all disabled:opacity-50">
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-black text-white mb-2">Bulk Update Stock</h3>
            <p className="text-white/50 text-sm mb-6">
              Update {selectedVariants.size} selected variant{selectedVariants.size > 1 ? "s" : ""}
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkAction("set")}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                    bulkAction === "set"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.05]"
                  )}
                >
                  Set to Value
                </button>
                <button
                  onClick={() => setBulkAction("adjust")}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all",
                    bulkAction === "adjust"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.05]"
                  )}
                >
                  Add/Subtract
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">
                  {bulkAction === "set" ? "New Stock Value" : "Amount to Add (+) or Subtract (-)"}
                </label>
                <input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder={bulkAction === "set" ? "e.g., 50" : "e.g., 10 or -5"}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkValue("");
                }}
                className="flex-1 py-3 px-4 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkUpdate}
                disabled={!bulkValue || isBulkSaving}
                className="flex-1 py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {isBulkSaving ? "Updating..." : "Update All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-white">Stock History</h3>
                <p className="text-white/50 text-sm">
                  {historyProduct.name} — {historySku}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {historyLoading ? (
                <div className="space-y-3 py-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-white/30">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>No history available</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {historyLogs.map((log, index) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        log.newStock > log.previousStock
                          ? "bg-emerald-500/10 text-emerald-400"
                          : log.newStock < log.previousStock
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-white/30"
                      )}>
                        {log.newStock > log.previousStock ? (
                          <Plus className="w-5 h-5" />
                        ) : log.newStock < log.previousStock ? (
                          <Minus className="w-5 h-5" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">
                            {log.previousStock} → {log.newStock}
                          </span>
                          <span className="text-white/30 text-xs">
                            {new Date(log.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-white/40 text-xs capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-white">Import Inventory</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportCsv("");
                  setImportPreview(null);
                }}
                className="p-2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importPreview ? (
              <>
                <p className="text-white/50 text-sm mb-4">
                  Paste CSV content with columns: Product ID, SKU, Stock (and optionally Price, Low Stock Threshold)
                </p>
                <textarea
                  value={importCsv}
                  onChange={(e) => setImportCsv(e.target.value)}
                  placeholder={`Product ID,Product Name,SKU,Price,Stock,Reserved,Available,Low Stock Threshold
prod_123,My Product,S,999,50,0,50,3
prod_123,My Product,M,999,30,0,30,3`}
                  className="flex-1 min-h-[200px] p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportCsv("");
                    }}
                    className="flex-1 py-3 px-4 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!importCsv.trim()) return;
                      setImportLoading(true);
                      try {
                        const res = await adminFetch("/api/admin/inventory/import", {
                          method: "POST",
                          body: JSON.stringify({ csv: importCsv, preview: true }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setImportPreview(data);
                        } else {
                          toast.error(data.error || "Failed to preview");
                        }
                      } catch (e) {
                        toast.error("Failed to preview");
                      } finally {
                        setImportLoading(false);
                      }
                    }}
                    disabled={!importCsv.trim() || importLoading}
                    className="flex-1 py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {importLoading ? "Previewing..." : "Preview"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-4 bg-white/[0.03] rounded-xl">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white/50">
                      Products: <span className="text-white font-bold">{importPreview.summary.totalProducts}</span>
                    </span>
                    <span className="text-white/50">
                      Variants: <span className="text-white font-bold">{importPreview.summary.totalVariants}</span>
                    </span>
                    {importPreview.summary.errors > 0 && (
                      <span className="text-red-400">
                        Errors: <span className="font-bold">{importPreview.summary.errors}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                  <div className="space-y-2">
                    {importPreview.products.map((prod: any) => (
                      <div key={prod.productId} className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold text-sm">{prod.productName}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            prod.exists ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          )}>
                            {prod.exists ? "Exists" : "Not Found"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {prod.updates.map((u: any) => (
                            <div key={u.sku} className="flex items-center gap-3 text-xs">
                              <span className="text-white/60 w-16">{u.sku}</span>
                              <span className="text-white/40">
                                {u.currentStock !== null ? `${u.currentStock} → ` : "→ "}
                                <span className="text-emerald-400 font-bold">{u.newStock}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setImportPreview(null)}
                    className="flex-1 py-3 px-4 bg-white/[0.03] hover:bg-white/[0.06] text-white/70 rounded-xl font-bold transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      setImportLoading(true);
                      try {
                        const res = await adminFetch("/api/admin/inventory/import", {
                          method: "POST",
                          body: JSON.stringify({ csv: importCsv, preview: false }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          toast.success(`Imported ${data.summary.success} products`);
                          setShowImportModal(false);
                          setImportCsv("");
                          setImportPreview(null);
                          fetchProducts();
                        } else {
                          toast.error(data.error || "Import failed");
                        }
                      } catch (e) {
                        toast.error("Import failed");
                      } finally {
                        setImportLoading(false);
                      }
                    }}
                    disabled={importLoading}
                    className="flex-1 py-3 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {importLoading ? "Importing..." : "Confirm Import"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
