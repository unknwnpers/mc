"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Archive, ShoppingBag,
  Users, BarChart2, LogOut, ChevronRight, Menu, X, Shield, Tag, Percent, Image, Images, MonitorPlay, Share2, MessageSquare, Palette
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const NAV = [
  { href: "/admin",           label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/products",  label: "Products",    icon: Package },
  { href: "/admin/collections", label: "Collections", icon: Image },
  { href: "/admin/images",    label: "Images",      icon: Images },
  { href: "/admin/inventory", label: "Inventory",   icon: Archive },
  { href: "/admin/orders",    label: "Orders",      icon: ShoppingBag },
  { href: "/admin/users",     label: "Users",       icon: Users },
  { href: "/admin/reviews",   label: "Reviews",     icon: MessageSquare },
  { href: "/admin/offers",    label: "Offers",      icon: Percent },
  { href: "/admin/coupons",   label: "Coupons",     icon: Tag },
  { href: "/admin/social-media",label: "Social Media", icon: Share2 },
  { href: "/admin/homepage",    label: "Homepage",    icon: LayoutDashboard }, // You can use a better icon if you want, e.g., Layout
  { href: "/admin/flash-screen", label: "Flash Screen", icon: MonitorPlay },
  { href: "/admin/security",  label: "Security",    icon: Shield,   superadminOnly: true },
  { href: "/admin/theme",     label: "Theme",       icon: Palette,  superadminOnly: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname();
  const router        = useRouter();
  const { user, profile, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  const isSuperAdmin = profile?.role === "superadmin";

  async function handleSignOut() {
    await signOut(auth);
    toast.success("Signed out");
    router.push("/login");
  }

  // Loading
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-rose-400 border-t-transparent" />
    </div>
  );

  // Not Admin
  if (!user || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="bg-[#111] border border-white/[0.06] p-10 rounded-3xl text-center max-w-sm w-full">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <LayoutDashboard className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-white/40 mb-6 text-sm">Administrator credentials required.</p>
        <Link href="/" className="inline-block bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-400 hover:text-white transition-all">
          Return to Store
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={cn(
        "flex flex-col bg-[#111] border-r border-white/[0.06] transition-all duration-300 shrink-0",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}>
        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-5 py-6 border-b border-white/[0.06]", collapsed && "justify-center px-0")}>
          {!collapsed && (
            <div>
              <p className="text-white font-black text-base leading-none">Miks & Chiks</p>
              <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Admin</p>
            </div>
          )}
          <button onClick={() => setCollapsed(v => !v)}
            className={cn("text-white/30 hover:text-white transition-colors ml-auto", collapsed && "ml-0")}>
            {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.filter(item => !item.superadminOnly || isSuperAdmin).map(({ href, label, icon: Icon }) => {
            const exact   = href === "/admin";
            const active  = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group",
                  active
                    ? "bg-white text-black"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white",
                  collapsed && "justify-center px-0"
                )}>
                <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-black" : "text-white/40 group-hover:text-white")} />
                {!collapsed && <span>{label}</span>}
                {!collapsed && active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* User + Sign Out */}
        <div className={cn("px-3 py-4 border-t border-white/[0.06]", collapsed && "flex justify-center")}>
          {collapsed ? (
            <button onClick={handleSignOut} className="text-white/30 hover:text-red-400 transition-colors p-2">
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/80 text-xs font-bold truncate">{profile?.name || user.email}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">{profile?.role}</p>
              </div>
              <button onClick={handleSignOut} className="text-white/20 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
