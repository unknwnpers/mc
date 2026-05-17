"use client";

import { memo, useRef } from 'react';
import { Play, Heart as HeartIcon, MessageCircle, Eye, Instagram, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

interface Reel {
  id: string;
  thumbnail: string;
  username: string;
  avatar: string;
  likes: string;
  comments: string;
  views: string;
  caption: string;
  link: string;
}

const REELS: Reel[] = [
  {
    id: '1',
    thumbnail: 'https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=640&h=1136&auto=format&fit=crop',
    username: 'miksandchiks',
    avatar: '#F4B5AD',
    likes: '2.4K',
    comments: '186',
    views: '12.3K',
    caption: 'Softness that stays with every tiny moment ✨',
    link: '#',
  },
  {
    id: '2',
    thumbnail: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=640&h=1136&auto=format&fit=crop',
    username: 'miksandchiks',
    avatar: '#E9897E',
    likes: '1.8K',
    comments: '142',
    views: '8.7K',
    caption: 'Made with love, worn with joy 💕',
    link: '#',
  },
  {
    id: '3',
    thumbnail: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=640&h=1136&auto=format&fit=crop',
    username: 'miksandchiks',
    avatar: '#C86B5F',
    likes: '3.1K',
    comments: '214',
    views: '15.1K',
    caption: 'Every stitch tells a story of comfort 🌸',
    link: '#',
  },
  {
    id: '4',
    thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=640&h=1136&auto=format&fit=crop',
    username: 'miksandchiks',
    avatar: '#F4B5AD',
    likes: '2.1K',
    comments: '159',
    views: '10.4K',
    caption: 'Little moments, big memories 🤍',
    link: '#',
  },
  {
    id: '5',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=640&h=1136&auto=format&fit=crop',
    username: 'miksandchiks',
    avatar: '#E9897E',
    likes: '1.6K',
    comments: '98',
    views: '9.2K',
    caption: 'Premium comfort for your precious ones ✨',
    link: '#',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const InstagramReels = memo(function InstagramReels({ socialSettings = {} }: { socialSettings?: Record<string, string> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const instagramUrl = socialSettings?.instagram || "https://instagram.com/miksandchiks";

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' });
  };

  return (
    <section className="py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden" style={{ background: '#FDF7F3' }}>
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-[#E9897E]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16"
        >
          <div>
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#E9897E] mb-3">
              Our Community
            </p>
            <h2 className="font-serif font-bold text-[32px] md:text-[42px] leading-[1.1] text-[#1E1E1E] mb-3 md:mb-4">
              From Our Instagram
            </h2>
            <p className="text-[15px] md:text-[17px] leading-[1.8] text-[#6B6B6B] max-w-[560px] mt-3">
              Real moments from real moms — join our community of thousands sharing the journey of motherhood.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Scroll arrows */}
            <div className="hidden md:flex gap-2">
              <button onClick={() => scroll('left')} className="w-11 h-11 rounded-full border border-[rgba(233,137,126,0.12)] bg-white flex items-center justify-center text-[#5C5C5C] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300 active:scale-95">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll('right')} className="w-11 h-11 rounded-full border border-[rgba(233,137,126,0.12)] bg-white flex items-center justify-center text-[#5C5C5C] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300 active:scale-95">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Follow button */}
            <Link
              href={instagramUrl}
              target="_blank"
              className="group inline-flex items-center gap-2.5 h-[50px] px-6 rounded-full bg-white border border-[rgba(233,137,126,0.12)] text-[14px] font-semibold text-[#1E1E1E] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] transition-all duration-300"
            >
              <Instagram className="w-4 h-4" />
              Follow @miksandchiks
            </Link>
          </div>
        </motion.div>

        {/* ── REELS SHOWCASE ── */}
        <motion.div
          ref={scrollRef}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={containerVariants}
          className="flex gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:-mx-6 md:px-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {REELS.map((reel) => (
            <motion.div key={reel.id} variants={itemVariants} className="snap-start shrink-0">
              <ReelCard reel={reel} instagramUrl={instagramUrl} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
});

/* ── REEL CARD ── */
function ReelCard({ reel, instagramUrl }: { reel: Reel, instagramUrl: string }) {
  return (
    <Link
      href={reel.link !== '#' ? reel.link : instagramUrl}
      target="_blank"
      className="group relative block min-w-[220px] md:min-w-[280px] w-[220px] md:w-[320px] h-[400px] md:h-[560px] rounded-[32px] overflow-hidden hover:-translate-y-1.5 transition-all duration-300 md:duration-500 ease-out"
      style={{ boxShadow: '0 22px 55px rgba(0,0,0,0.06)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 28px 65px rgba(0,0,0,0.10)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 22px 55px rgba(0,0,0,0.06)'; }}
    >
      {/* Thumbnail */}
      <img
        src={reel.thumbnail}
        alt={reel.caption}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[800ms] ease-out"
      />

      {/* Overlay */}
      <div
        className="absolute inset-0 group-hover:opacity-100 opacity-90 transition-opacity duration-500"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.55))' }}
      />

      {/* Play Button (center, 72px) */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center border border-white/20 scale-90 group-hover:scale-100 transition-transform duration-400"
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}
        >
          <Play className="w-6 h-6 text-white fill-current ml-1" />
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        {/* Username row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-white/40 flex items-center justify-center"
            style={{ background: reel.avatar }}
          >
            <span className="text-white text-[10px] font-bold">M</span>
          </div>
          <span className="text-[15px] font-bold text-white">{reel.username}</span>
        </div>

        {/* Caption */}
        <p className="text-[14px] leading-[1.7] text-white/[0.88] line-clamp-2 mb-3">
          {reel.caption}
        </p>

        {/* Engagement row */}
        <div className="flex items-center gap-4 text-[13px] text-white/[0.82]">
          <span className="flex items-center gap-1.5">
            <HeartIcon className="w-3.5 h-3.5" />
            {reel.likes}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" />
            {reel.comments}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {reel.views}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default InstagramReels;
