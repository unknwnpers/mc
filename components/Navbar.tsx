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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/70 border-b border-neutral-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="h-10 w-10 bg-rose-400 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200 group-hover:rotate-12 transition-transform">
                <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-black text-neutral-900 tracking-tighter">
              MIKS<span className="text-rose-400">&</span>CHIKS
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-neutral-500 hover:text-rose-500 transition-colors duration-200 font-bold text-sm uppercase tracking-widest"
              >
                {link.name}
              </Link>
            ))}

            {user?.email === "admin@miksandchiks.com" && (
              <Link
                href="/admin/orders"
                className="text-rose-500 hover:text-rose-600 transition-colors duration-200 font-black text-sm uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-xl"
              >
                Admin
              </Link>
            )}

            <div className="h-6 w-px bg-neutral-200" />

            <Link href="/cart" className="relative p-2 text-neutral-700 hover:text-rose-500 transition-all hover:scale-110">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] shadow-lg shadow-rose-200">
                  {cart.length}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-6">
                <Link href="/profile" className="text-sm font-bold text-neutral-800 hover:text-rose-500 transition-colors">
                  My Profile
                </Link>
                <Link href="/orders" className="text-sm font-bold text-neutral-800 hover:text-rose-500 transition-colors">
                  My Orders
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-neutral-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500 transition-all shadow-lg active:scale-95"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-neutral-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500 transition-all shadow-lg active:scale-95"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <Link href="/cart" className="relative p-2 text-neutral-700">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {cart.length}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-neutral-50 text-neutral-900"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100 animate-in slide-in-from-top duration-300">
          <div className="px-6 py-8 space-y-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-2xl font-black text-neutral-900 hover:text-rose-500"
              >
                {link.name}
              </Link>
            ))}

            {user?.email === "admin@miksandchiks.com" && (
               <Link
                href="/admin/orders"
                onClick={() => setIsOpen(false)}
                className="block text-2xl font-black text-rose-500"
              >
                Admin Panel
              </Link>
            )}

            <div className="h-px bg-neutral-100" />
            
            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block text-xl font-bold text-neutral-800"
                >
                  My Profile
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsOpen(false)}
                  className="block text-xl font-bold text-neutral-800"
                >
                  My Orders
                </Link>
                <button
                    onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                    }}
                    className="w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold text-lg"
                >
                    Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block w-full bg-neutral-900 text-white py-4 rounded-2xl font-bold text-lg text-center"
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
