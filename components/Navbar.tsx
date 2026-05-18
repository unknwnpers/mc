'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, ShoppingBag, User, Search, LogOut, ChevronDown, ShieldCheck, Truck, RefreshCw, Banknote, Heart, Home, Grid3X3, Package } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { logoutUser } from '@/lib/auth';
import { toast } from 'sonner';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_CACHE_KEY = 'miks-chiks-logo-url';
const LOGO_CACHE_TTL = 30 * 60 * 1000;

const navLinks = [
  { label: 'Home', href: '/' },
  {
    label: 'Shop',
    href: '#',
    dropdown: [
      { label: 'All Products', href: '/products' },
      { label: 'Maternity', href: '/products?category=maternity' },
      { label: 'Kids Wear', href: '/products?category=kids' },
      { label: 'Baby Care', href: '/products?category=baby' },
    ],
  },
  {
    label: 'Collections', href: '/products?featured=true', dropdown: [
      { label: 'Best Sellers', href: '/products?featured=true' },
      { label: 'New Arrivals', href: '/products?new=true' },
      { label: 'Under ₹999', href: '/products?maxPrice=999' },
    ]
  },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const announcementItems = [
  { icon: Truck, text: 'Free Shipping' },
  { icon: RefreshCw, text: 'Easy 10-Day Replacement' },
  { icon: Banknote, text: 'COD Available' },
  { icon: ShieldCheck, text: '100% Secure Payments' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo.png');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { cart } = useCart();
  const { user, profile } = useAuth();
  const dropdownTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    async function fetchLogo() {
      try {
        const cached = sessionStorage.getItem(LOGO_CACHE_KEY);
        if (cached) {
          const { url, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < LOGO_CACHE_TTL) { setLogoUrl(url); return; }
        }
      } catch { }
      try {
        const response = await fetch('/api/images?category=system&subcategory=logo&limit=1');
        const data = await response.json();
        if (data.success && data.images.length > 0) {
          const url = data.images[0].url;
          setLogoUrl(url);
          try { sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({ url, timestamp: Date.now() })); } catch { }
        }
      } catch (error) { console.error('Error fetching logo:', error); }
    }
    fetchLogo();
  }, []);

  const handleLogout = useCallback(async () => {
    try { await logoutUser(); toast.success("Logged out successfully"); }
    catch { toast.error("Logout failed"); }
  }, []);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(label);
  };
  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100]">
        {/* ═══ ANNOUNCEMENT BAR ═══ */}
        <div
          className={cn(
            "transition-all duration-500 overflow-hidden border-b border-[rgba(200,178,115,0.06)]",
            isScrolled ? "h-0 opacity-0" : "h-[36px] opacity-100"
          )}
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)' }}
        >
          {/* Desktop: centered row */}
          <div className="hidden md:flex max-w-[1320px] mx-auto px-6 h-full items-center justify-center gap-10">
            {announcementItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-[#B8A89A]">
                <item.icon className="w-3.5 h-3.5 text-[#C8B273]" />
                {item.text}
              </div>
            ))}
          </div>
          {/* Mobile: horizontal scroll */}
          <div className="flex md:hidden h-full items-center overflow-x-auto scrollbar-hide px-4 gap-6">
            {announcementItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium text-[#B8A89A] whitespace-nowrap shrink-0">
                <item.icon className="w-3 h-3 text-[#C8B273]" />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* ═══ MAIN NAVBAR ═══ */}
        <nav
          className={cn(
            "transition-all duration-500 border-b",
            isScrolled
              ? "border-[rgba(200,178,115,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              : "border-transparent shadow-none"
          )}
          style={{
            height: '78px',
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'saturate(180%) blur(20px)',
            WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          }}
        >
          <div className="max-w-[1320px] mx-auto px-6 h-full flex justify-between items-center relative">

            {/* ── LOGO ── */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity duration-300 group shrink-0">
              <div className="relative w-11 h-11 md:w-12 md:h-12">
                <Image src={logoUrl} alt="Miks & Chiks" fill sizes="48px" className="object-contain group-hover:scale-105 transition-transform duration-500" priority />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-xl md:text-[22px] text-[#C8B273] font-bold tracking-tight">
                  Miks & <span className="text-[#C8B273] italic">Chiks</span>
                </span>
                <span className="text-[9px] tracking-[0.2em] text-[#B8A89A] uppercase font-medium mt-0.5">
                  Premium Maternity & Kids
                </span>
              </div>
            </Link>

            {/* ── DESKTOP NAV LINKS (center) ── */}
            <div className="hidden lg:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) =>
                link.dropdown ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => handleDropdownEnter(link.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <button className="flex items-center gap-1.5 text-[14px] font-semibold tracking-[0.08em] uppercase text-[#6E625B] hover:text-[#C8B273] transition-colors duration-300 py-2 cursor-pointer">
                      {link.label}
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-300", activeDropdown === link.label && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === link.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
                        >
                          <div className="bg-white rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[rgba(200,178,115,0.08)] py-3 px-2 min-w-[210px]">
                            {link.dropdown.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                className="block text-[13px] font-medium text-[#6E625B] hover:text-[#C8B273] hover:bg-[#FDFCF9] px-4 py-2.5 rounded-xl transition-all duration-200"
                                onClick={() => setActiveDropdown(null)}
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="relative text-[14px] font-semibold tracking-[0.08em] uppercase text-[#6E625B] hover:text-[#C8B273] transition-colors duration-300 py-2 group/link"
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-[#C8B273] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left duration-300 rounded-full" />
                  </Link>
                )
              )}
            </div>

            {/* ── DESKTOP RIGHT ACTIONS ── */}
            <div className="hidden md:flex items-center gap-5">
              {isAdmin && (
                <Link href="/admin/orders" className="text-[#B89B5E] hover:text-[#C8B273] font-semibold text-[11px] uppercase tracking-wider bg-[#FDFCF9] px-4 py-2 rounded-xl border border-[rgba(200,178,115,0.10)] transition-colors">
                  Admin
                </Link>
              )}
              <button className="p-2 text-[#B8A89A] hover:text-[#C8B273] hover:bg-[#FDFCF9] rounded-full transition-all duration-300 hover:scale-110">
                <Search className="h-5 w-5" />
              </button>
              <Link href="/profile" className="p-2 text-[#B8A89A] hover:text-[#C8B273] hover:bg-[#FDFCF9] rounded-full transition-all duration-300 hover:scale-110">
                <Heart className="h-5 w-5" />
              </Link>
              <Link href="/cart" className="relative p-2 text-[#B8A89A] hover:text-[#C8B273] hover:bg-[#FDFCF9] rounded-full transition-all duration-300 hover:scale-110">
                <ShoppingBag className="h-5 w-5" />
                {cart.length > 0 && (
                  <motion.span
                    key={cart.length}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 bg-[#C8B273] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-[0_2px_8px_rgba(200,178,115,0.4)]"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </Link>
              {user ? (
                <div className="relative" onMouseEnter={() => handleDropdownEnter('account')} onMouseLeave={handleDropdownLeave}>
                  <button className="p-1.5 rounded-full transition-all duration-300">
                    <div className="w-9 h-9 rounded-full bg-[#FDFCF9] flex items-center justify-center border border-[rgba(200,178,115,0.10)] hover:scale-105 transition-transform">
                      <User className="h-4 w-4 text-[#C8B273]" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'account' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 pt-3 z-50"
                      >
                        <div className="bg-white rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[rgba(200,178,115,0.08)] p-4 min-w-[220px]">
                          <div className="mb-3 pb-3 border-b border-[rgba(200,178,115,0.08)]">
                            <p className="text-[11px] font-medium text-[#B8A89A] mb-0.5">Signed in as</p>
                            <p className="font-semibold text-[#3B312C] truncate text-sm">{user.email || user.phoneNumber}</p>
                          </div>
                          <Link href="/profile" className="flex items-center gap-3 text-[13px] font-medium text-[#6E625B] hover:text-[#C8B273] py-2.5 px-2 rounded-xl hover:bg-[#FDFCF9] transition-all" onClick={() => setActiveDropdown(null)}>
                            <User className="w-4 h-4" /> Profile
                          </Link>
                          <Link href="/profile?tab=orders" className="flex items-center gap-3 text-[13px] font-medium text-[#6E625B] hover:text-[#C8B273] py-2.5 px-2 rounded-xl hover:bg-[#FDFCF9] transition-all" onClick={() => setActiveDropdown(null)}>
                            <ShoppingBag className="w-4 h-4" /> My Orders
                          </Link>
                          <button onClick={() => { handleLogout(); setActiveDropdown(null); }} className="w-full mt-2 flex items-center gap-3 text-[13px] font-semibold text-white bg-[#C8B273] px-4 py-2.5 rounded-xl hover:bg-[#B89B5E] transition-all">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/login" className="bg-[#C8B273] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#B89B5E] transition-all duration-300 shadow-[0_4px_16px_rgba(200,178,115,0.25)] hover:-translate-y-0.5 active:scale-[0.97]">
                  Login
                </Link>
              )}
            </div>

            {/* ── MOBILE: Cart + Hamburger ── */}
            <div className="flex lg:hidden items-center gap-2">
              <Link href="/cart" className="relative p-2 text-[#6E625B]">
                <ShoppingBag className="h-5 w-5" />
                {cart.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#C8B273] text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">
                    {cart.length}
                  </span>
                )}
              </Link>
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-[#6E625B] hover:bg-[#FDFCF9] transition-colors">
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <X className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <Menu className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </nav>

        {/* ═══ MOBILE DRAWER ═══ */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[380px] z-50 lg:hidden overflow-y-auto"
                style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(24px)' }}
              >
                <div className="p-6 pt-20 space-y-6">
                  <nav className="space-y-1">
                    {[
                      { label: 'Home', href: '/' },
                      { label: 'Shop All', href: '/products' },
                    ].map(item => (
                      <Link key={item.label} href={item.href} onClick={() => setIsOpen(false)} className="block text-[22px] font-serif font-bold text-[#3B312C] py-3 hover:text-[#C8B273] transition-colors">
                        {item.label}
                      </Link>
                    ))}
                    {['Maternity', 'Kids Wear', 'Baby Care'].map(cat => (
                      <Link key={cat} href={`/products?category=${cat.toLowerCase().replace(' ', '-')}`} onClick={() => setIsOpen(false)} className="block text-[16px] font-medium text-[#6E625B] py-2.5 pl-4 border-l-2 border-[rgba(200,178,115,0.15)] hover:text-[#C8B273] hover:border-[#C8B273] transition-all">
                        {cat}
                      </Link>
                    ))}
                    <Link href="/products?new=true" onClick={() => setIsOpen(false)} className="block text-[22px] font-serif font-bold text-[#C8B273] italic py-3">
                      New Arrivals
                    </Link>
                    <Link href="/about" onClick={() => setIsOpen(false)} className="block text-[22px] font-serif font-bold text-[#3B312C] py-3 hover:text-[#C8B273] transition-colors">
                      About Us
                    </Link>
                    <Link href="/contact" onClick={() => setIsOpen(false)} className="block text-[22px] font-serif font-bold text-[#3B312C] py-3 hover:text-[#C8B273] transition-colors">
                      Contact
                    </Link>
                  </nav>
                  <div className="h-px bg-[rgba(200,178,115,0.10)]" />
                  {user ? (
                    <div className="space-y-3">
                      <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[15px] font-medium text-[#6E625B] py-3 hover:text-[#C8B273]"><User className="w-5 h-5" /> My Profile</Link>
                      <Link href="/profile?tab=orders" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-[15px] font-medium text-[#6E625B] py-3 hover:text-[#C8B273]"><ShoppingBag className="w-5 h-5" /> My Orders</Link>
                      <button onClick={() => { handleLogout(); setIsOpen(false); }} className="w-full bg-[#C8B273] text-white py-4 rounded-[14px] font-semibold text-[15px] shadow-[0_6px_20px_rgba(200,178,115,0.25)] active:scale-[0.97] transition-transform">Logout</button>
                    </div>
                  ) : (
                    <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full bg-[#C8B273] text-white py-4 rounded-[14px] font-semibold text-[15px] text-center shadow-[0_6px_20px_rgba(200,178,115,0.25)]">Login / Register</Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ MOBILE BOTTOM BAR ═══ */}
      <div className="fixed bottom-3 left-3 right-3 z-[99] lg:hidden">
        <div className="bottom-nav rounded-[22px] border border-[rgba(200,178,115,0.08)]">
          <div className="flex items-center justify-around py-1.5 px-1">
            {[
              { href: '/', icon: Home, label: 'Home' },
              { href: '/products', icon: Grid3X3, label: 'Shop' },
              { href: '/cart', icon: ShoppingBag, label: 'Cart', badge: cart.length },
              { href: '/profile?tab=orders', icon: Package, label: 'Orders' },
              { href: user ? '/profile' : '/login', icon: User, label: user ? 'Profile' : 'Login' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[44px] py-1.5 px-2 text-[#B8A89A] hover:text-[#C8B273] active:text-[#C8B273] transition-colors">
                <item.icon className="w-[22px] h-[22px]" />
                {item.badge ? (
                  <span className="absolute top-0.5 right-0.5 bg-[#C8B273] text-white text-[9px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white">{item.badge}</span>
                ) : null}
                <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
