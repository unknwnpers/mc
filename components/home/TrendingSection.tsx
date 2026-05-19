"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

interface TrendingSectionProps {
  products: Product[];
}

export default function TrendingSection({ products }: TrendingSectionProps) {
  if (products.length === 0) return null;

  const campaignProduct = products[0];
  const trendingProducts = products.slice(1, 5);

  return (
    <section className="section-trending py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden" style={{ background: 'var(--mc-bg-light-section)' }}>
      {/* Background glow */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#C8B273]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="mb-12 md:mb-16"
        >
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#C8B273] mb-3">
            Just Dropped
          </p>
          <h2 className="font-serif font-bold text-[32px] md:text-[42px] leading-[1.1] text-[#3B312C] mb-3 md:mb-4">
            Trending This Week
          </h2>
          <p className="text-[15px] md:text-[17px] leading-[1.8] text-[#6B6B6B] max-w-[560px]">
            Fresh styles handpicked for the season — designed for comfort, crafted with love.
          </p>
        </motion.div>

        {/* ── MAIN CONTENT: Editorial Split ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4 md:gap-6 lg:gap-8 items-stretch">

          {/* ═══ LEFT: Featured Campaign Card ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease }}
          >
            <Link
              href={`/products/${campaignProduct.id}`}
              className="group relative block rounded-[36px] overflow-hidden w-full h-[420px] md:h-[520px] lg:h-[720px]"
              style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.06)' }}
            >
              <Image
                src={campaignProduct.images?.[0] || '/placeholder.svg'}
                alt={campaignProduct.name}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover group-hover:scale-[1.04] transition-transform duration-[1.2s] ease-out"
              />
              {/* Overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.88) 100%)' }} />

              {/* NEW badge */}
              <div className="absolute top-6 left-6 bg-[#C8B273] text-white text-[12px] font-bold px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(200, 178, 115,0.3)]">
                NEW
              </div>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <p className="text-[13px] font-extrabold tracking-[0.15em] uppercase text-[#D4B87B] mb-3">
                  {campaignProduct.category_slug || "New Collection"}
                </p>
                <h3 className="font-serif font-bold text-[32px] md:text-[52px] leading-[1.05] text-white tracking-tight mb-3">
                  Designed for<br />
                  <span className="italic">Beautiful Beginnings</span>
                </h3>
                <p className="text-[17px] leading-[1.8] text-white/95 max-w-[420px] mb-6 hidden md:block">
                  Celebrate every milestone in premium comfort — our newest collection blends softness with timeless elegance.
                </p>

                {/* CTA */}
                <div
                  className="group/cta inline-flex items-center gap-3 h-[52px] px-7 rounded-full border border-white/20 text-white text-[14px] font-semibold hover:bg-white/25 transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
                >
                  Shop Collection
                  <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ═══ RIGHT: Trending Product Grid ═══ */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
          >
            {/* Desktop: 2x2 grid */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 h-full">
              {trendingProducts.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <MiniProductCard product={product} />
                </motion.div>
              ))}
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="flex md:hidden gap-4 overflow-x-auto py-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 -my-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {products.slice(0, 6).map((product) => (
                <div key={product.id} className="min-w-[72%] snap-start py-1">
                  <MiniProductCard product={product} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Mini Product Card (compact premium) ── */
function MiniProductCard({ product }: { product: Product }) {
  const displayImage = product.images?.[0] || '/placeholder.svg';
  const displayPrice = product.variants?.[0]?.price ?? 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group bg-white rounded-[28px] overflow-hidden flex flex-col h-full border border-[rgba(200, 178, 115,0.06)] hover:-translate-y-1.5 transition-all duration-300 ease-out"
      style={{ boxShadow: '0 14px 35px rgba(0,0,0,0.04)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 48px rgba(200, 178, 115,0.10)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 14px 35px rgba(0,0,0,0.04)'; }}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/5] bg-[#F8F1EC] rounded-t-[27px]">
        <Image
          src={displayImage} alt={product.name} fill
          sizes="(max-width: 768px) 72vw, 25vw"
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        {/* NEW badge */}
        <div className="absolute top-3 left-3 bg-[#C8B273] text-white text-[11px] font-bold px-3 py-1 rounded-full">
          NEW
        </div>
        {/* Quick Add (desktop hover) */}
        <div className="absolute bottom-3 left-3 right-3 translate-y-12 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
          <div className="bg-[#C8B273] text-white h-[40px] rounded-full flex items-center justify-center gap-2 text-[13px] font-semibold shadow-[0_6px_20px_rgba(200, 178, 115,0.3)]">
            <ShoppingBag className="w-3.5 h-3.5" />
            Quick Add
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#C8B273] mb-1">
          {product.category_slug || "New Arrival"}
        </p>
        <h3 className="text-[15px] md:text-[17px] font-bold text-[#3B312C] leading-[1.4] line-clamp-2 mb-auto">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-3 pt-3 border-t border-[rgba(200, 178, 115,0.06)]">
          <span className="text-[20px] md:text-[22px] font-extrabold text-[#3B312C]">
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </Link>
  );
}
