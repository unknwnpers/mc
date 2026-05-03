"use client";
import { Search, Filter, Calendar, IndianRupee, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_STATUSES = ["all", "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"];

interface FiltersBarProps {
  filters: any;
  setFilters: (filters: any) => void;
  onClear: () => void;
}

export function FiltersBar({ filters, setFilters, onClear }: FiltersBarProps) {
  const hasActiveFilters = filters.search || filters.status !== "all" || filters.dateRange !== "all" || filters.minAmount || filters.maxAmount || filters.paymentMethod !== "all";

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] p-6 rounded-3xl shadow-2xl mb-8 space-y-6 backdrop-blur-xl sticky top-4 z-30">
      {/* Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        <Filter className="w-4 h-4 text-white/20 shrink-0" />
        <div className="flex gap-1">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilters({ ...filters, status: s })}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold transition-all border capitalize whitespace-nowrap",
                filters.status === s
                  ? "bg-white text-black border-white shadow-lg shadow-white/10"
                  : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:border-white/20 hover:text-white"
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Search Bar */}
        <div className="lg:col-span-5 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search by ID, name, email..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
          />
        </div>

        {/* Other Filters */}
        <div className="lg:col-span-7 flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex-1 min-w-[140px] relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <select
              value={filters.dateRange}
              onChange={e => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white/60 focus:outline-none focus:border-white/20 appearance-none transition-all"
            >
              <option value="all" className="bg-[#111]">All Time</option>
              <option value="today" className="bg-[#111]">Today</option>
              <option value="week" className="bg-[#111]">This Week</option>
              <option value="month" className="bg-[#111]">This Month</option>
            </select>
          </div>

          {/* Amount Filter */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <IndianRupee className="w-4 h-4 text-white/20" />
            <input
              type="number"
              placeholder="Min"
              value={filters.minAmount}
              onChange={e => setFilters({ ...filters, minAmount: e.target.value })}
              className="w-16 bg-transparent text-sm text-white focus:outline-none"
            />
            <span className="text-white/10">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAmount}
              onChange={e => setFilters({ ...filters, maxAmount: e.target.value })}
              className="w-16 bg-transparent text-sm text-white focus:outline-none"
            />
          </div>

          {/* Sort */}
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1 gap-1">
            <button
              onClick={() => setFilters({ ...filters, sortBy: 'date', sortOrder: filters.sortBy === 'date' && filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                filters.sortBy === 'date' ? "bg-white text-black" : "text-white/40 hover:text-white"
              )}
            >
              Date {filters.sortBy === 'date' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => setFilters({ ...filters, sortBy: 'amount', sortOrder: filters.sortBy === 'amount' && filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                filters.sortBy === 'amount' ? "bg-white text-black" : "text-white/40 hover:text-white"
              )}
            >
              Amount {filters.sortBy === 'amount' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-rose-400 hover:text-rose-300 transition-colors text-xs font-bold"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
