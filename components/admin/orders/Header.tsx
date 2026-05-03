"use client";
import { Download, RefreshCw, ShoppingBag } from "lucide-react";
import { StatsCard } from "./StatsCard";
import { cn } from "@/lib/utils";

interface HeaderProps {
  totalOrders: number;
  pendingOrders: number;
  onExport: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({ totalOrders, pendingOrders, onExport, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
      <div className="flex items-center gap-5">
        <div className="h-16 w-16 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center justify-center shadow-2xl text-white">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Orders</h1>
          <p className="text-white/40 font-medium text-sm mt-1">Secure — orders fetched via API</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-4">
          <StatsCard title="Total" value={totalOrders} icon={ShoppingBag} className="min-w-[140px] p-4" />
          <StatsCard title="Pending" value={pendingOrders} icon={RefreshCw} variant="danger" className="min-w-[140px] p-4" />
        </div>
        
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all text-sm font-bold text-white shadow-xl"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] transition-all disabled:opacity-50 shadow-xl"
          >
            <RefreshCw className={cn("w-5 h-5 text-white/60", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>
    </div>
  );
}
