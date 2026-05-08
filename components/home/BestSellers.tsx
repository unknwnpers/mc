"use client";

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/types';

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

interface BestSellersProps {
  products: Product[];
}

export default function BestSellers({ products }: BestSellersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  if (products.length === 0) return null;

  return (
    <section className="py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden" style={{ background: '#FFF9F6' }}>
      {/* Subtle background glow */}
      <div className="absolute left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E9897E]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12"
        >
          <div>
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#E9897E] mb-3">
              Most Loved Collections
            </p>
            <h2 className="font-serif font-bold text-[30px] md:text-[48px] leading-[1.1] text-[#1E1E1E] mb-2 md:mb-3">
              Best Sellers
            </h2>
            <p className="text-[15px] md:text-[17px] leading-[1.8] text-[#6B6B6B] max-w-[560px]">
              Handpicked favorites loved by thousands of moms — premium quality, irresistible comfort.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Scroll Arrows */}
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-11 h-11 rounded-full border border-[rgba(233,137,126,0.12)] bg-white flex items-center justify-center text-[#5C5C5C] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-11 h-11 rounded-full border border-[rgba(233,137,126,0.12)] bg-white flex items-center justify-center text-[#5C5C5C] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* View All */}
            <Link
              href="/products"
              className="group inline-flex items-center gap-2.5 h-[48px] px-6 rounded-full bg-white border border-[rgba(233,137,126,0.12)] text-[14px] font-semibold text-[#1E1E1E] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300"
            >
              View All
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* ── DESKTOP GRID: 4 columns ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={containerVariants}
          className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {products.slice(0, 8).map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>

        {/* ── MOBILE: horizontal snap scroll ── */}
        <div
          ref={scrollRef}
          className="flex md:hidden gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
        >
          {products.map((product) => (
            <div key={product.id} className="min-w-[75%] sm:min-w-[48%] snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
