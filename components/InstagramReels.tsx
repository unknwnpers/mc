"use client";

import { memo, useRef } from 'react';
import { Play, Eye, Instagram, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Reel {
  id: string;
  thumbnail: string;
  views: string;
  link: string;
}

const REELS: Reel[] = [
  { id: '1', thumbnail: 'https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=400&h=700&auto=format&fit=crop', views: '12.3K', link: '#' },
  { id: '2', thumbnail: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=400&h=700&auto=format&fit=crop', views: '8.7K', link: '#' },
  { id: '3', thumbnail: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=400&h=700&auto=format&fit=crop', views: '15.1K', link: '#' },
  { id: '4', thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=400&h=700&auto=format&fit=crop', views: '10.4K', link: '#' },
  { id: '5', thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=400&h=700&auto=format&fit=crop', views: '9.2K', link: '#' },
  { id: '6', thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=400&h=700&auto=format&fit=crop', views: '7.5K', link: '#' },
];

const InstagramReels = memo(function InstagramReels() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-24 bg-cream/30">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blush font-black text-xs uppercase tracking-[0.3em]">
              <Instagram className="w-4 h-4" />
              From Our Instagram
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight">
              Real Moments, <span className="text-blush italic">Real Love</span>
            </h2>
            <p className="text-neutral-500 font-sans">
              Follow us <span className="text-charcoal font-bold">@miksandchiks</span> for daily motherhood inspiration.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-12 h-12 rounded-full border border-[#F3E8E5] bg-white flex items-center justify-center hover:bg-blush hover:text-white transition-all shadow-sm active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-12 h-12 rounded-full border border-[#F3E8E5] bg-white flex items-center justify-center hover:bg-blush hover:text-white transition-all shadow-sm active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <Link
              href="https://instagram.com"
              target="_blank"
              className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blush hover:text-charcoal transition-colors ml-4"
            >
              View All Reels <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory"
        >
          {REELS.map((reel) => (
            <Link
              key={reel.id}
              href={reel.link}
              target="_blank"
              className="relative min-w-[240px] md:min-w-[280px] aspect-[9/16] rounded-[32px] overflow-hidden group snap-start shadow-xl shadow-rose-100/20"
            >
              <img
                src={reel.thumbnail}
                alt="Instagram Reel"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
                  <Play className="w-6 h-6 text-white fill-current" />
                </div>
              </div>

              <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest">{reel.views} views</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

export default InstagramReels;
