"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Archive, RefreshCw, Minus, Plus, Check, AlertTriangle } from "lucide-react";

type Variant = { sku: string; price: number; stock: number; options?: Record<string, string> };
interface Product { id: string; name: string; variants: Variant[]; images: string[]; isActive: boolean; }

async function adminFetch(url: string, opts: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) } });
}

export default function InventoryPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [edits,    setEdits]      = useState<Record<string, Record<string, number>>>({});  // { productId: { size: newStock } }
  const [saving,   setSaving]     = useState<string | null>(null);  // "productId:size"

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

  const allLowStock = products.flatMap(p =>
    (p.variants || []).filter(v => v.stock <= 3).map(v => ({ name: p.name, sku: v.sku }))
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">Inventory</h1>
          <p className="text-white/30 text-sm mt-1">Click +/− or type to edit stock, then ✓ to save</p>
        </div>
        <button onClick={fetchProducts} disabled={fetching}
          className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white transition-all border border-white/[0.06]">
          <RefreshCw className={cn("w-5 h-5", fetching && "animate-spin")} />
        </button>
      </div>

      {/* Low Stock Alert */}
      {allLowStock.length > 0 && (
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

      {fetching ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.03] rounded-2xl animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 text-white/20 font-semibold">
          <Archive className="w-10 h-10 mx-auto mb-3 opacity-50" />
          No active products found
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
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
                <span className="text-white/20 text-xs font-mono">{p.id.slice(0, 10)}…</span>
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
                    const stockColor   = currentStock === 0 ? "text-red-400" : currentStock <= 3 ? "text-amber-400" : "text-emerald-400";

                    return (
                      <div key={sku} className={cn(
                        "bg-white/[0.03] rounded-xl p-3 border transition-all",
                        dirty ? "border-white/20" : "border-white/[0.04]"
                      )}>
                        <div className="flex items-center justify-between mb-2">
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

                        <div className="flex items-center justify-between">
                          <span className={cn("text-[10px] font-black uppercase", stockColor)}>
                            {currentStock === 0 ? "OOS" : `${currentStock} left`}
                          </span>
                          {dirty && (
                            <button onClick={() => saveStock(p.id, sku, currentStock)}
                              disabled={saving === key}
                              className="w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all disabled:opacity-50">
                              <Check className="w-3 h-3" />
                            </button>
                          )}
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
    </div>
  );
}
