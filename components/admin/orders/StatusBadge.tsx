"use client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OrderStatus = 'pending_payment' | 'paid' | 'created' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'failed' | 'expired';

const statusStyles: Record<OrderStatus, string> = {
  pending_payment: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  paid:            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  created:         "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  processing:      "bg-amber-500/10 text-amber-500 border-amber-500/20",
  shipped:         "bg-blue-500/10 text-blue-500 border-blue-500/20",
  delivered:       "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled:       "bg-red-500/10 text-red-500 border-red-500/20",
  failed:          "bg-red-500/10 text-red-500 border-red-500/20",
  expired:         "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase() as OrderStatus;
  const style = statusStyles[normalizedStatus] || statusStyles.created;
  
  return (
    <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap", style)}>
      {status.replace("_", " ")}
    </Badge>
  );
}
