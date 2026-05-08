"use client";

import { memo, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CuratedCollection } from '@/lib/types';

const CollectionCard = memo(function CollectionCard({ collection }: { collection: CuratedCollection }) {
  const { title, subtitle, backgroundImage } = collection;
  const [imgError, setImgError] = useState(false);

  const linkHref = useMemo(() => {
    if (collection.type === "manual" && (collection.products?.length ?? 0) > 0) return `/products?collection=${collection.id}`;
    if (collection.type === "auto" && collection.filter) {
      const p = new URLSearchParams();
      if (collection.filter.category) p.set('category', collection.filter.category);
      if (collection.filter.isFeatured) p.set('featured', 'true');
      if (collection.filter.isNew) p.set('new', 'true');
      if (collection.filter.maxPrice) p.set('maxPrice', collection.filter.maxPrice.toString());
      if (collection.filter.limit) p.set('limit', collection.filter.limit.toString());
      return `/products?${p.toString()}`;
    }
    return '/products';
  }, [collection]);

  const itemCount = collection.products?.length
    ? `${collection.products.length}+ Products`
    : "Explore Collection";

  return (
    <Link
      href={linkHref}
      className="group relative isolate overflow-hidden rounded-[32px] block h-full"
      style={{ boxShadow: '0 18px 45px rgba(0,0,0,0.05)' }}
    >
      {/* Image */}
      {backgroundImage && !imgError ? (
        <img
          src={backgroundImage} alt={title} loading="lazy" decoding="async"
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-[1.06] transition-transform duration-[800ms] ease-out"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF0EE] to-[#F8D5D0]" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.45))' }} />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex items-end justify-between">
        <div className="group-hover:-translate-y-1 transition-transform duration-300">
          <h3 className="font-serif font-bold text-[24px] md:text-[30px] text-white leading-tight tracking-tight mb-1">
            {title}
          </h3>
          {subtitle && <p className="text-[14px] font-medium text-white/[0.82] line-clamp-1 max-w-[240px]">{subtitle}</p>}
          {!subtitle && <p className="text-[14px] font-medium text-white/[0.82]">{itemCount}</p>}
        </div>
        <div
          className="w-[48px] h-[48px] rounded-full flex items-center justify-center border border-white/15 shrink-0 group-hover:translate-x-1 group-hover:bg-white/25 transition-all duration-300"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </Link>
  );
});

export default CollectionCard;
