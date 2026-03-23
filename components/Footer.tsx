import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-neutral-50 to-rose-50/30 border-t border-neutral-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Miks & Chiks
            </h3>
            <p className="text-neutral-600 text-sm leading-relaxed">
              Your trusted destination for comfortable and stylish maternity and kids wear.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-neutral-600 hover:text-rose-400 transition-colors text-sm"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/products"
                  className="text-neutral-600 hover:text-rose-400 transition-colors text-sm"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="text-neutral-600 hover:text-rose-400 transition-colors text-sm"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-neutral-600 hover:text-rose-400 transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-4">
              Contact Info
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <Phone className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-600 text-sm">
                  +91 9XXXXXXXXX
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <Mail className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-600 text-sm">
                  support@miksandchiks.com
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-neutral-800 mb-4">
              Visit Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-600 text-sm">
                  Near Lulu Mall, Edappally<br />
                  Kochi, Kerala – 682024<br />
                  India
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span className="text-neutral-600 text-sm">
                  Mon - Sat: 10 AM - 7 PM
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200/50 text-center">
          <p className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} Miks & Chiks. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
