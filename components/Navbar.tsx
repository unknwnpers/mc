'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, ShoppingBag, User, Search, LogOut, ChevronDown, ShieldCheck, Truck, RefreshCw, Banknote } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { logoutUser } from '@/lib/auth';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Cache key for logo URL
const LOGO_CACHE_KEY = 'miks-chiks-logo-url';
const LOGO_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const { cart } = useCart();
  const { user, profile } = useAuth();

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch logo with caching
  useEffect(() => {
    async function fetchLogo() {
      try {
        const cached = sessionStorage.getItem(LOGO_CACHE_KEY);
        if (cached) {
          const { url, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < LOGO_CACHE_TTL) {
            setLogoUrl(url);
            return;
          }
        }
      } catch {}

      try {
        const response = await fetch('/api/images?category=system&subcategory=logo&limit=1');
        const data = await response.json();
        if (data.success && data.images.length > 0) {
          const url = data.images[0].url;
          setLogoUrl(url);
          try {
            sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({ url, timestamp: Date.now() }));
          } catch {}
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    }
    fetchLogo();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Logout failed");
    }
  }, []);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      {/* ── TOP TRUST BAR ────────────────────────────────────── */}
      <div className={cn(
        "bg-[#2B2B2B] text-white py-2 px-4 transition-all duration-500 overflow-hidden",
        isScrolled ? "h-0 opacity-0 py-0" : "h-auto opacity-100"
      )}>
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-x-8 gap-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
            <Truck className="w-3 h-3 text-blush" />
            Free Shipping on orders above ₹699
          </div>
          <div className="hidden lg:flex items-center gap-8">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
              <RefreshCw className="w-3 h-3 text-blush" />
              Easy 7-Day Returns
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
              <Banknote className="w-3 h-3 text-blush" />
              COD Available
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
              <ShieldCheck className="w-3 h-3 text-blush" />
              100% Secure Payments
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN NAV ─────────────────────────────────────────── */}
      <nav className={cn(
        "transition-all duration-500 border-b",
        isScrolled
          ? "bg-white/95 backdrop-blur-xl border-[#F3E8E5] py-3 shadow-sm"
          : "bg-white border-transparent py-5"
      )}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-all group shrink-0">
            <div className="relative w-12 h-12 md:w-14 md:h-14">
              <Image
                src={logoUrl}
                alt="Miks & Chiks"
                fill
                className="object-contain transition-transform duration-700 group-hover:scale-110"
                priority
              />
            </div>
            <div className="flex flex-col leading-[1.1] pt-0.5">
              <span className="font-serif text-xl md:text-2xl text-gold tracking-wide">
                Miks & <span className="text-gold italic">Chiks</span>
              </span>
              <span className="text-[9px] md:text-[10px] tracking-[0.35em] text-neutral-400 uppercase font-bold mt-1">
                Premium Maternity & Kids
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-10 absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="text-charcoal/80 hover:text-blush transition-colors text-xs font-black uppercase tracking-[0.2em]">Home</Link>
            <div className="group relative">
              <Link href="/products" className="text-charcoal/80 hover:text-blush transition-colors text-xs font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                Shop <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform" />
              </Link>
              {/* Simple Dropdown placeholder */}
              <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="bg-white border border-[#F3E8E5] rounded-2xl shadow-xl p-6 min-w-[200px]">
                   <Link href="/products?category=maternity" className="block text-xs font-bold text-neutral-500 hover:text-blush py-2 uppercase tracking-widest">Maternity</Link>
                   <Link href="/products?category=kids" className="block text-xs font-bold text-neutral-500 hover:text-blush py-2 uppercase tracking-widest">Kids Wear</Link>
                   <Link href="/products?category=baby" className="block text-xs font-bold text-neutral-500 hover:text-blush py-2 uppercase tracking-widest">Baby Care</Link>
                </div>
              </div>
            </div>
            <Link href="/products?new=true" className="text-charcoal/80 hover:text-blush transition-colors text-xs font-black uppercase tracking-[0.2em]">New Arrivals</Link>
            <Link href="/about" className="text-charcoal/80 hover:text-blush transition-colors text-xs font-black uppercase tracking-[0.2em]">Our Story</Link>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center space-x-6">
            {isAdmin && (
              <Link
                href="/admin/orders"
                className="text-gold hover:text-gold-light transition-colors font-black text-[10px] uppercase tracking-widest bg-cream px-4 py-2 rounded-xl border border-gold/10"
              >
                Admin
              </Link>
            )}

            <button className="p-2 text-charcoal/70 hover:text-blush transition-all">
              <Search className="h-5 w-5" />
            </button>

            <Link href="/cart" className="relative p-2 text-charcoal/70 hover:text-blush transition-all">
              <ShoppingBag className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blush text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-blush/30 border-2 border-white">
                  {cart.length}
                </span>
              )}
            </Link>

            {user ? (
              <div className="group relative">
                <button className="flex items-center gap-2 p-1.5 rounded-full bg-cream/50 border border-blush/5 text-charcoal/80 hover:text-blush transition-all">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-blush/10">
                    <User className="h-4 w-4" />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <div className="absolute top-full right-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                   <div className="bg-white border border-[#F3E8E5] rounded-3xl shadow-2xl p-6 min-w-[240px]">
                      <div className="mb-4 pb-4 border-b border-neutral-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Signed in as</p>
                        <p className="font-serif font-bold text-charcoal truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" className="flex items-center gap-3 text-xs font-bold text-neutral-500 hover:text-blush py-3 uppercase tracking-widest"><User className="w-4 h-4" /> Profile</Link>
                      <Link href="/orders" className="flex items-center gap-3 text-xs font-bold text-neutral-500 hover:text-blush py-3 uppercase tracking-widest"><ShoppingBag className="w-4 h-4" /> My Orders</Link>
                      <button onClick={handleLogout} className="w-full mt-4 flex items-center gap-3 text-xs font-black text-white bg-blush px-5 py-3 rounded-2xl hover:bg-[#f48c82] transition-all uppercase tracking-widest shadow-lg shadow-blush/10">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                   </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-blush text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/10 active:scale-95"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-3">
            <Link href="/cart" className="relative p-2 text-charcoal">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blush text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {cart.length}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-cream text-charcoal"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-2xl border-t border-[#F3E8E5] h-screen animate-in slide-in-from-top duration-500">
          <div className="px-8 py-12 space-y-8">
            <nav className="space-y-6">
              <Link href="/" onClick={() => setIsOpen(false)} className="block text-4xl font-serif font-bold text-charcoal">Home</Link>
              <Link href="/products" onClick={() => setIsOpen(false)} className="block text-4xl font-serif font-bold text-charcoal">Shop All</Link>
              <Link href="/products?category=maternity" onClick={() => setIsOpen(false)} className="block text-4xl font-serif font-bold text-blush italic">Maternity</Link>
              <Link href="/products?category=kids" onClick={() => setIsOpen(false)} className="block text-4xl font-serif font-bold text-charcoal">Kids Wear</Link>
            </nav>

            <div className="h-px bg-neutral-100" />

            {user ? (
              <div className="space-y-6">
                <Link href="/profile" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-charcoal uppercase tracking-widest">My Profile</Link>
                <Link href="/orders" onClick={() => setIsOpen(false)} className="block text-xl font-bold text-charcoal uppercase tracking-widest">My Orders</Link>
                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full bg-blush text-white py-5 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-blush/20">Logout</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full bg-blush text-white py-5 rounded-3xl font-black text-lg text-center uppercase tracking-widest shadow-2xl shadow-blush/20">Login / Register</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
