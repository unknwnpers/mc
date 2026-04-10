import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-white to-cream border-t border-blush/10 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blush/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="h-20 w-auto">
                <img 
                  src="/logo.png" 
                  alt="Miks & Chiks" 
                  className="h-full w-auto object-contain"
                />
            </div>
            <p className="text-neutral-500 text-sm leading-relaxed font-medium">
              Your trusted destination for premium maternity and kids wear, crafted with love for your most precious moments.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black text-charcoal uppercase tracking-[0.2em] mb-8">
              Quick Links
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="/"
                  className="text-neutral-400 hover:text-blush transition-all text-sm font-bold uppercase tracking-widest"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/products"
                  className="text-neutral-400 hover:text-blush transition-all text-sm font-bold uppercase tracking-widest"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-neutral-400 hover:text-blush transition-all text-sm font-bold uppercase tracking-widest"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-neutral-400 hover:text-blush transition-all text-sm font-bold uppercase tracking-widest"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black text-charcoal uppercase tracking-[0.2em] mb-8">
              Contact Info
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 group">
                <Phone className="h-5 w-5 text-blush mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-neutral-500 text-sm font-medium">
                  +91 96335 72427
                </span>
              </li>
              <li className="flex items-start space-x-3 group">
                <Mail className="h-5 w-5 text-blush mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-neutral-500 text-sm font-medium">
                  miksandchiks@gmail.com
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black text-charcoal uppercase tracking-[0.2em] mb-8">
              Visit Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 group">
                <MapPin className="h-5 w-5 text-blush mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-neutral-500 text-sm font-medium">
                  Near Lulu Mall, Edappally<br />
                  Kochi, Kerala – 682024<br />
                  India
                </span>
              </li>
              <li className="flex items-start space-x-3 group">
                <Clock className="h-5 w-5 text-blush mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-neutral-500 text-sm font-medium">
                  Mon - Sat: 10:00 AM - 7:00 PM
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Miks & Chiks. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <a href="/privacy" className="text-xs font-black text-neutral-400 hover:text-blush uppercase tracking-[0.3em] transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-xs font-black text-neutral-400 hover:text-blush uppercase tracking-[0.3em] transition-colors">Terms of Service</a>
            <a href="/refund-policy" className="text-xs font-black text-neutral-400 hover:text-blush uppercase tracking-[0.3em] transition-colors">Refund Policy</a>
            <a href="/shipping-policy" className="text-xs font-black text-neutral-400 hover:text-blush uppercase tracking-[0.3em] transition-colors">Shipping</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
