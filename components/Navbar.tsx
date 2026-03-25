'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { logoutUser } from '@/lib/auth';
import { toast } from 'sonner';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { cart } = useCart();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Logout failed");
      console.error("Logout failed", err);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Shop', href: '/products' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#F3E8E5] shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex justify-between items-center h-[88px]">
        <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-all group">
          <div className="relative shrink-0">
            <img
              src="/logo.png"
              alt="Miks & Chiks"
              className="h-14 w-14 object-contain transition-transform duration-700 group-hover:scale-110"
            />
          </div>

          <div className="flex flex-col leading-[1.1] pt-0.5">
            <span className="font-serif text-2xl text-charcoal tracking-wide">
              Miks & <span className="text-gold italic">Chiks</span>
            </span>
            <span className="text-[9px] tracking-[0.35em] text-neutral-400 uppercase font-bold mt-1">
              Premium Maternity & Kids
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-10">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-charcoal/70 hover:text-blush transition-colors duration-300 font-bold text-[11px] uppercase tracking-[0.2em]"
            >
              {link.name}
            </Link>
          ))}

          {user?.email === "admin@miksandchiks.com" && (
            <Link
              href="/admin/orders"
              className="text-gold hover:text-gold-light transition-colors duration-300 font-black text-[11px] uppercase tracking-widest bg-cream px-4 py-2.5 rounded-xl border border-gold/10"
            >
              Admin
            </Link>
          )}

          <div className="h-6 w-px bg-[#F3E8E5]" />

          <Link href="/cart" className="relative p-2 text-charcoal hover:text-blush transition-all hover:scale-110">
            <ShoppingBag className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blush text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] shadow-lg shadow-blush/30">
                {cart.length}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-6">
              <Link href="/profile" className="text-[11px] font-bold text-charcoal/80 hover:text-blush transition-colors uppercase tracking-widest">
                Profile
              </Link>
              <Link href="/orders" className="text-[11px] font-bold text-charcoal/80 hover:text-blush transition-colors uppercase tracking-widest">
                Orders
              </Link>
              <button
                onClick={handleLogout}
                className="bg-blush text-white px-7 py-3 rounded-2xl text-[11px] font-bold hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/10 active:scale-95"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blush text-white px-8 py-3 rounded-2xl text-[11px] font-bold hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/10 active:scale-95"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <Link href="/cart" className="relative p-2 text-charcoal">
            <ShoppingBag className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blush text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] shadow-lg shadow-blush/30">
                {cart.length}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-xl bg-cream text-charcoal"
          >
            {isOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-[#F3E8E5] animate-in slide-in-from-top duration-300">
          <div className="px-6 py-8 space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-2xl font-bold text-charcoal font-serif hover:text-blush"
              >
                {link.name}
              </Link>
            ))}

            {user?.email === "admin@miksandchiks.com" && (
              <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="block text-2xl font-bold font-serif text-blush"
              >
                Admin Panel
              </Link>
            )}

            <div className="h-px bg-[#F3E8E5]" />

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block text-xl font-bold text-charcoal hover:text-blush transition-colors"
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsOpen(false)}
                  className="block text-xl font-bold text-charcoal hover:text-blush transition-colors"
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="w-full bg-blush text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-blush/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block w-full bg-blush text-white py-5 rounded-3xl font-bold text-lg text-center shadow-xl shadow-blush/10"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
