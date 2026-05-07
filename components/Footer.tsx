import { memo } from 'react';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#F3E8E5] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blush/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 lg:gap-24">

          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-8">
            <Link href="/" className="inline-block">
              <div className="h-16 w-auto">
                <img src="/logo.png" alt="Miks & Chiks" className="h-full w-auto object-contain" />
              </div>
            </Link>
            <p className="text-neutral-500 text-sm leading-relaxed font-medium max-w-sm">
              Your trusted destination for premium maternity and kids wear, crafted with love for your most precious moments. We celebrate the beauty of motherhood with soft fabrics and elegant designs.
            </p>
            <div className="flex items-center gap-4">
               <a href="#" className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-charcoal hover:bg-blush hover:text-white transition-all duration-300">
                  <Instagram className="w-5 h-5" />
               </a>
               <a href="#" className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-charcoal hover:bg-blush hover:text-white transition-all duration-300">
                  <Facebook className="w-5 h-5" />
               </a>
               <a href="#" className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-charcoal hover:bg-blush hover:text-white transition-all duration-300">
                  <MessageCircle className="w-5 h-5" />
               </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-2">
            <h4 className="text-[10px] font-black text-charcoal uppercase tracking-[0.25em] mb-8">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Home</Link></li>
              <li><Link href="/products" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Shop All</Link></li>
              <li><Link href="/products?new=true" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">New Arrivals</Link></li>
              <li><Link href="/about" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Our Story</Link></li>
              <li><Link href="/contact" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Contact</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-[10px] font-black text-charcoal uppercase tracking-[0.25em] mb-8">Customer Care</h4>
            <ul className="space-y-4">
              <li><Link href="/shipping-policy" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Shipping</Link></li>
              <li><Link href="/refund-policy" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Returns</Link></li>
              <li><Link href="/privacy" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Privacy</Link></li>
              <li><Link href="/terms" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">Terms</Link></li>
              <li><Link href="/faq" className="text-neutral-400 hover:text-blush transition-all text-xs font-bold uppercase tracking-widest">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-4">
            <h4 className="text-[10px] font-black text-charcoal uppercase tracking-[0.25em] mb-8">Get In Touch</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center text-blush shrink-0"><Phone className="h-5 w-5" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Phone</p>
                  <p className="text-charcoal font-bold text-sm">+91 96335 72427</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center text-blush shrink-0"><Mail className="h-5 w-5" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Email</p>
                  <p className="text-charcoal font-bold text-sm">miksandchiks@gmail.com</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-cream flex items-center justify-center text-blush shrink-0"><Clock className="h-5 w-5" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-1">Hours</p>
                  <p className="text-charcoal font-bold text-sm">Mon - Sat: 10:00 AM - 7:00 PM</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Icons */}
        <div className="mt-20 pt-10 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
             <img src="/payment/visa.svg" alt="Visa" className="h-4 w-auto" />
             <img src="/payment/mastercard.svg" alt="Mastercard" className="h-6 w-auto" />
             <img src="/payment/upi.svg" alt="UPI" className="h-4 w-auto" />
             <img src="/payment/razorpay.svg" alt="Razorpay" className="h-4 w-auto" />
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-[0.3em]">© {currentYear} Miks & Chiks. All rights reserved.</p>
            <p className="text-neutral-300 text-[9px] font-bold uppercase tracking-widest">Designed for Modern Mothers in Kerala</p>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
