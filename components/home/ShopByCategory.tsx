"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import CollectionCard from '@/components/CollectionCard';
import type { CuratedCollection, Category } from '@/lib/types';
import { cn } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

const fallbackCategories = [
  {
    title: "Maternity Wear",
    count: "120+ Products",
    href: "/products?category=maternity",
    image: "https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=800",
    featured: true,
  },
  {
    title: "Feeding Wear",
    count: "80+ Products",
    href: "/products?category=feeding",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=600",
  },
  {
    title: "Newborn Essentials",
    count: "95+ Products",
    href: "/products?category=newborn",
    image: "https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=600",
  },
  {
    title: "Kids Wear",
    count: "110+ Products",
    href: "/products?category=kids",
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=600",
  },
  {
    title: "Nursery & Bedding",
    count: "60+ Products",
    href: "/products?category=nursery",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=600",
  },
  {
    title: "Mom Essentials",
    count: "45+ Products",
    href: "/products?category=mom-essentials",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600",
  },
];

interface ShopByCategoryProps {
  collections: CuratedCollection[];
  categories: Category[];
}

function CategoryCardInline({
  title, count, image, href, className,
}: {
  title: string; count: string; image: string; href: string; className?: string;
}) {
  return (
    <Link href={href} className={cn("group relative overflow-hidden rounded-[32px] block h-full", className)} style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.05)' }}>
      <img
        src={image} alt={title} loading="lazy" decoding="async"
        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[800ms] ease-out"
      />
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.45))' }} />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex items-end justify-between">
        <div className="group-hover:-translate-y-1 transition-transform duration-300">
          <h3 className="font-serif font-bold text-[24px] md:text-[30px] text-white leading-tight tracking-tight mb-1">
            {title}
          </h3>
          <p className="text-[14px] font-medium text-white/[0.82]">{count}</p>
        </div>
        <div
          className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-white/15 group-hover:translate-x-1 group-hover:bg-white/25 transition-all duration-300 shrink-0"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </Link>
  );
}

export default function ShopByCategory({ collections, categories }: ShopByCategoryProps) {
  const hasCollections = collections.length > 0;

  return (
    <section className="py-16 md:py-24 relative" style={{ background: '#FFF9F6' }}>
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E9897E]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        {/* ── CENTERED HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-[720px] mx-auto mb-10 md:mb-16"
        >
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#E9897E] mb-4">
            Explore Collections
          </p>
          <h2 className="font-serif font-bold text-[30px] md:text-[48px] leading-[1.1] text-[#1E1E1E]">
            Shop by Category
          </h2>
          <p className="text-[15px] md:text-[17px] leading-[1.8] text-[#6B6B6B] mt-4 md:mt-6">
            Curated collections designed with love for every stage of motherhood and every milestone of childhood.
          </p>
        </motion.div>

        {/* ── DESKTOP / TABLET: Asymmetric grid ── */}
        {hasCollections ? (
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[260px] lg:auto-rows-[280px]"
          >
            {collections.slice(0, 6).map((col, idx) => (
              <motion.div
                key={col.id} variants={itemVariants}
                className={cn(idx === 0 && "lg:row-span-2")}
              >
                <CollectionCard collection={col} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial="hidden" whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[260px] lg:auto-rows-[280px]"
          >
            {fallbackCategories.map((cat, idx) => (
              <motion.div
                key={idx} variants={itemVariants}
                className={cn(cat.featured && "lg:row-span-2")}
              >
                <CategoryCardInline
                  title={cat.title} count={cat.count}
                  image={cat.image} href={cat.href}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── MOBILE: Horizontal snap scroll ── */}
        <div className="flex md:hidden gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
          {(hasCollections
            ? collections.slice(0, 6).map((col) => ({
                key: col.id,
                title: col.title,
                count: `${col.products?.length || 0}+ Products`,
                image: col.backgroundImage || '',
                href: `/products?collection=${col.id}`,
              }))
            : fallbackCategories.map((cat, idx) => ({
                key: String(idx),
                title: cat.title,
                count: cat.count,
                image: cat.image,
                href: cat.href,
              }))
          ).map((item) => (
            <div key={item.key} className="min-w-[280px] h-[360px] snap-start shrink-0">
              <CategoryCardInline
                title={item.title} count={item.count}
                image={item.image} href={item.href}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
