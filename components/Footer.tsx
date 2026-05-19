"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Youtube, ChevronDown, Mail, Phone, MapPin, Clock, ShieldCheck, RefreshCw, Banknote, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const quickLinks = [
  { label: "Shop All", href: "/products" },
  { label: "Maternity Wear", href: "/products?category=maternity" },
  { label: "Kids Wear", href: "/products?category=kids" },
  { label: "New Arrivals", href: "/products?new=true" },
  { label: "Best Sellers", href: "/products?featured=true" },
];

const customerCare = [
  { label: "Track Order", href: "/profile?tab=orders" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Replacement & Refunds", href: "/refund-policy" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Cookies Policy", href: "/cookies" },
];

const trustBadges = [
  { icon: ShieldCheck, text: "Secure Payments" },
  { icon: RefreshCw, text: "Easy Replacement" },
  { icon: Banknote, text: "COD Available" },
  { icon: Star, text: "Premium Quality" },
];

const socials = [
  { icon: Instagram, href: "https://instagram.com/miksandchiks", label: "Instagram" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

const instaImages = [
  "https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=200&h=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=200&h=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=200&h=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=200&h=200&auto=format&fit=crop",
];



export default function Footer({ socialSettings = {} }: { socialSettings?: Record<string, string> }) {
  const dynamicSocials = [
    { icon: Instagram, href: socialSettings.instagram || "https://instagram.com/miksandchiks", label: "Instagram" },
    ...(socialSettings.facebook ? [{ icon: Facebook, href: socialSettings.facebook, label: "Facebook" }] : [{ icon: Facebook, href: "#", label: "Facebook" }]),
    ...(socialSettings.youtube ? [{ icon: Youtube, href: socialSettings.youtube, label: "YouTube" }] : [{ icon: Youtube, href: "#", label: "YouTube" }]),
    // We can also add X and Whatsapp if they exist in the settings, without breaking layout too much.
    ...(socialSettings.x ? [{ icon: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>, href: socialSettings.x, label: "X" }] : []),
    ...(socialSettings.whatsapp ? [{ icon: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /><path d="M16 14.5a2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 2.5-2.5 2.5 2.5 0 0 1 2.5 2.5z" opacity="0" /></svg>, href: socialSettings.whatsapp, label: "WhatsApp" }] : []),
  ];

  const instagramUrl = socialSettings.instagram || "https://instagram.com/miksandchiks";

  return (
    <footer className="w-full max-w-full overflow-hidden border-t" style={{ background: 'var(--mc-bg-footer)', borderColor: 'var(--mc-border-gold)' }}>
      {/* ═══ MAIN FOOTER ═══ */}
      <div className="max-w-[1320px] mx-auto px-4 md:px-6 pt-20 md:pt-28 pb-12 md:pb-16">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-8 lg:gap-12 items-start pb-16 border-b" style={{ borderColor: 'var(--mc-border)' }}>

          {/* Col 1: Brand */}
          <div className="max-w-[320px]">
            <Link href="/" className="inline-block group">
              <span className="font-serif text-[32px] font-bold tracking-[0.03em]" style={{ color: 'var(--mc-gold)' }}>
                Miks & <span className="italic">Chiks</span>
              </span>
              <span className="block text-[10px] tracking-[0.2em] uppercase font-medium mt-1" style={{ color: 'var(--mc-text-muted)' }}>
                Premium Maternity & Kids
              </span>
            </Link>

            <p className="text-sm md:text-[15px] leading-[1.9] mt-6" style={{ color: 'var(--mc-text-body)' }}>
              Thoughtfully designed maternity & kids wear crafted with the softest fabrics, bringing comfort and joy to every moment of motherhood.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2.5 mt-6">
              {trustBadges.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full border"
                  style={{ background: 'var(--mc-bg-light-section-card)', borderColor: 'var(--mc-border)', color: 'var(--mc-text-body)' }}
                >
                  <b.icon className="w-3 h-3" style={{ color: 'var(--mc-gold)' }} />
                  {b.text}
                </span>
              ))}
            </div>

            {/* Socials */}
            <div className="flex flex-wrap gap-3 mt-6">
              {dynamicSocials.map((s, i) => (
                <Link
                  key={i}
                  href={s.href}
                  target="_blank"
                  aria-label={s.label}
                  className="w-[44px] h-[44px] rounded-full flex items-center justify-center border hover:text-white hover:bg-[var(--mc-gold)] hover:border-[var(--mc-gold)] hover:-translate-y-0.5 transition-all duration-300"
                  style={{ background: 'var(--mc-bg-card)', borderColor: 'var(--mc-border)', color: 'var(--mc-text-muted)' }}
                >
                  <s.icon className="w-[18px] h-[18px]" />
                </Link>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-[16px] font-bold mb-6" style={{ color: 'var(--mc-text-heading)' }}>Quick Links</h3>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm md:text-[15px] hover:text-[var(--mc-gold)] hover:translate-x-1 inline-block transition-all duration-300" style={{ color: 'var(--mc-text-body)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div>
            <h3 className="text-[16px] font-bold mb-6" style={{ color: 'var(--mc-text-heading)' }}>Customer Care</h3>
            <ul className="space-y-4">
              {customerCare.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm md:text-[15px] hover:text-[var(--mc-gold)] hover:translate-x-1 inline-block transition-all duration-300" style={{ color: 'var(--mc-text-body)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h3 className="text-[16px] font-bold mb-6" style={{ color: 'var(--mc-text-heading)' }}>Get in Touch</h3>
            <div className="space-y-4">
              {[
                { icon: Mail, content: "hello@miksandchiks.com", href: "mailto:miksandchiks@gmail.com" },
                { icon: Phone, content: "+91 9633 374 657", href: "tel:+919633374657" },
                { icon: Phone, content: "WhatsApp: +91 9633 374 657", href: "https://wa.me/919633374657" },
                { icon: MapPin, content: "Kakkara House, nettoor PO, Cochin, Kerala-682040, India" },
                { icon: Clock, content: "Mon–Sun, 10AM–10PM IST" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <item.icon className="w-4 h-4 mt-1 shrink-0" style={{ color: 'var(--mc-gold)' }} />
                  {item.href ? (
                    <Link href={item.href} className="text-sm md:text-[15px] leading-[1.8] hover:text-[var(--mc-gold)] transition-colors duration-300" style={{ color: 'var(--mc-text-body)' }}>
                      {item.content}
                    </Link>
                  ) : (
                    <span className="text-sm md:text-[15px] leading-[1.8]" style={{ color: 'var(--mc-text-body)' }}>{item.content}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Col 5: Instagram Preview */}
          <div>
            <h3 className="text-[16px] font-bold mb-6" style={{ color: 'var(--mc-text-heading)' }}>Instagram</h3>
            <div className="grid grid-cols-2 gap-3">
              {instaImages.map((img, i) => (
                <Link key={i} href={instagramUrl} target="_blank" className="group relative rounded-xl overflow-hidden w-[88px] h-[88px]">
                  <img src={img} alt="Instagram" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-[#C8B273]/20 transition-colors duration-300" />
                </Link>
              ))}
            </div>
            <Link
              href={instagramUrl}
              target="_blank"
              className="inline-flex items-center gap-2 text-[13px] font-semibold mt-4 hover:text-[var(--mc-gold-dark)] transition-colors"
              style={{ color: 'var(--mc-gold)' }}
            >
              <Instagram className="w-3.5 h-3.5" />
              @miksandchiks
            </Link>
          </div>
        </div>

        {/* ═══ PAYMENT METHODS ═══ */}
        <div className="flex flex-wrap items-center justify-center gap-5 py-8 border-b mt-8 lg:mt-0" style={{ borderColor: 'var(--mc-border)' }}>
          {["Visa", "Mastercard", "UPI", "Paytm", "Razorpay", "COD"].map((method) => (
            <span
              key={method}
              className="text-[12px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border"
              style={{ color: 'var(--mc-text-muted)', borderColor: 'var(--mc-border)', background: 'var(--mc-bg-card)' }}
            >
              {method}
            </span>
          ))}
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
          <div className="flex flex-col gap-1">
            <p className="text-[14px]" style={{ color: 'var(--mc-text-muted)' }}>
              © {new Date().getFullYear()} Miks &amp; Chiks. All rights reserved. Made with ❤️ in Kerala.
            </p>
            <p className="text-[13px]" style={{ color: 'var(--mc-text-muted)', opacity: 0.7 }}>
              Kerala-Based Brand · GST Registered · hello@miksandchiks.com
            </p>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Cookies", href: "/cookies" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[14px] hover:text-[var(--mc-gold)] transition-colors duration-300"
                style={{ color: 'var(--mc-text-muted)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
