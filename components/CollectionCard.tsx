"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CuratedCollection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CollectionCardProps {
  collection: CuratedCollection;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const { title, subtitle, cardStyle, backgroundImage } = collection;

  // Generate link based on collection type
  const getCollectionLink = () => {
    if (collection.type === "manual" && collection.products && collection.products.length > 0) {
      // For manual collections, link to products page with specific product filter
      return `/products?collection=${collection.id}`;
    } else if (collection.type === "auto" && collection.filter) {
      // For auto collections, build query from filter
      const params = new URLSearchParams();
      if (collection.filter.category) params.set('category', collection.filter.category);
      return `/products?${params.toString()}`;
    }
    return '/products';
  };

  // Card style variants
  const cardStyles = {
    large: "col-span-1 sm:col-span-2 lg:col-span-2 h-[400px]",
    compact: "col-span-1 h-[400px]",
    banner: "col-span-1 sm:col-span-2 lg:col-span-4 h-[300px]",
  };

  const linkHref = getCollectionLink();

  return (
    <Link
      href={linkHref}
      className={cn(
        "group relative isolate overflow-hidden rounded-[40px] backdrop-blur-sm bg-cream border border-blush/10 hover:shadow-2xl hover:shadow-blush/20 transition-all duration-700 block",
        cardStyles[cardStyle]
      )}
    >
      {/* Background Image */}
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt={title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blush/10 to-gold/10" />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
        <h3 className="text-3xl font-serif font-bold text-white tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-white/80 text-sm line-clamp-2 font-medium">
            {subtitle}
          </p>
        )}
        <div className="pt-4 flex items-center space-x-3 text-white font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500">
          <span>Discover</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
