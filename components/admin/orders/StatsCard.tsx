"use client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "danger" | "success" | "warning";
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, variant = "default", className }: StatsCardProps) {
  const variants = {
    default: "bg-white/[0.03] border-white/[0.06] text-white",
    danger:  "bg-red-500/10 border-red-500/20 text-red-500",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  };

  return (
    <div className={cn("flex items-center gap-4 p-5 rounded-2xl border transition-all hover:scale-[1.02]", variants[variant], className)}>
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", 
        variant === "default" ? "bg-white/5" : "bg-current/10"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-0.5">{title}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}
