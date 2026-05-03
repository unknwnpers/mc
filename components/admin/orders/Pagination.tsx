"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (val: number) => void;
  totalItems: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, setItemsPerPage, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-10 px-4">
      <div className="flex flex-wrap items-center gap-6">
        <p className="text-white/30 text-sm font-medium">
          Showing <span className="text-white font-black">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-white font-black">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span className="text-white font-black">{totalItems}</span> orders
        </p>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-white/20">Show:</span>
          <select
            value={itemsPerPage}
            onChange={e => setItemsPerPage(Number(e.target.value))}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-white/60 focus:outline-none focus:border-white/20 transition-all cursor-pointer"
          >
            {[10, 25, 50, 100].map(val => (
              <option key={val} value={val} className="bg-[#111]">{val}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-11 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-bold text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) pageNum = currentPage - 2 + i;
              if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
            }
            if (pageNum > totalPages || pageNum <= 0) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "h-11 w-11 rounded-2xl text-sm font-black transition-all border",
                  currentPage === pageNum
                    ? "bg-white text-black border-white shadow-xl shadow-white/10"
                    : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white hover:border-white/20 hover:bg-white/[0.05]"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="h-11 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.08] disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-bold text-sm"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
