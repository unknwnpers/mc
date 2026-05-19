"use client";

import { useRef, useState } from 'react';
import { Star, ArrowRight, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const testimonials = [
  {
    name: "Priya Menon",
    location: "Kochi, Kerala",
    avatar: "#F1DE9D",
    initial: "P",
    rating: 5,
    text: "The maternity kurtas are so unbelievably soft — I wore them through my entire pregnancy and even after. The fabric quality is exceptional, breathable, and holds up beautifully after every wash.",
    product: "Maternity Kurta Set",
  },
  {
    name: "Ananya Krishnan",
    location: "Thrissur, Kerala",
    avatar: "#C8B273",
    initial: "A",
    rating: 5,
    text: "Finally found baby clothes that are truly gentle on sensitive skin. My newborn has never had a reaction — these are the only clothes I trust. The organic cotton is pure luxury for little ones.",
    product: "Newborn Essentials Kit",
  },
  {
    name: "Divya Nair",
    location: "Trivandrum, Kerala",
    avatar: "#B89B5E",
    initial: "D",
    rating: 5,
    text: "The kids' wear collection is adorable and incredibly well-made. My daughter asks to wear her Miks & Chiks dresses every single day. The quality has held up amazingly — even after 50+ washes!",
    product: "Kids Cotton Dress",
  },
  {
    name: "Sneha Rajan",
    location: "Calicut, Kerala",
    avatar: "#F1DE9D",
    initial: "S",
    rating: 5,
    text: "I was skeptical about ordering online, but the quality exceeded all expectations. The nursing wear is so thoughtfully designed — functional and beautiful. I've recommended to every mom I know.",
    product: "Nursing Lounge Set",
  },
];

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const next = () => setActive((p) => (p + 1) % testimonials.length);
  const prev = () => setActive((p) => (p - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="section-testimonials py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden" style={{ background: 'var(--mc-bg-section)' }}>
      {/* Background glow */}
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#C8B273]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ═══ LEFT: Content + Stats ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease }}
            className="max-w-[520px]"
          >
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#C8B273] mb-4">
              Customer Love
            </p>

            <h2 className="font-serif font-bold text-[32px] md:text-[52px] leading-[1.08] tracking-tight" style={{ color: 'var(--mc-text-heading)' }}>
              Loved by Moms<br />
              Across Every <span className="italic text-[#C8B273]">Tiny Moment</span>
            </h2>

            <p className="text-[15px] md:text-[18px] leading-[1.9] mt-6 md:mt-8 max-w-[480px]" style={{ color: 'var(--mc-text-body)' }}>
              Thousands of mothers trust us with their most precious moments. 
              Hear their stories of comfort, joy, and genuine love for what we create.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6 md:gap-8 mt-8 md:mt-10 pt-6 md:pt-8 border-t border-[rgba(200, 178, 115,0.08)]">
              {[
                { number: "10K+", label: "Happy Moms" },
                { number: "4.8★", label: "Average Rating" },
                { number: "50K+", label: "Orders Delivered" },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-[28px] md:text-[32px] font-extrabold leading-none" style={{ color: 'var(--mc-text-heading)' }}>
                    {stat.number}
                  </p>
                  <p className="text-[14px] mt-1 font-medium" style={{ color: 'var(--mc-text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CTA + Navigation */}
            <div className="flex items-center gap-4 mt-10">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2.5 h-[54px] px-8 rounded-xl bg-[#C8B273] text-white text-[15px] font-semibold hover:bg-[#B89B5E] active:scale-[0.97] shadow-[0_8px_24px_rgba(200, 178, 115,0.25)] hover:shadow-[0_14px_36px_rgba(200, 178, 115,0.30)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Read More Stories
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              {/* Desktop nav arrows */}
              <div className="hidden lg:flex gap-2">
                <button onClick={prev} className="w-11 h-11 rounded-full border border-[rgba(200, 178, 115,0.12)] bg-white flex items-center justify-center text-[#6E625B] hover:bg-[#C8B273] hover:text-white hover:border-[#C8B273] transition-all duration-300 active:scale-95">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={next} className="w-11 h-11 rounded-full border border-[rgba(200, 178, 115,0.12)] bg-white flex items-center justify-center text-[#6E625B] hover:bg-[#C8B273] hover:text-white hover:border-[#C8B273] transition-all duration-300 active:scale-95">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* ═══ RIGHT: Testimonial Cards (Desktop: stacked floating, Mobile: swipe) ═══ */}

          {/* Desktop: Animated single card */}
          <div className="hidden lg:block relative min-h-[480px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.4, ease }}
              >
                <TestimonialCard testimonial={testimonials[active]} />
              </motion.div>
            </AnimatePresence>

            {/* Background layered cards for depth */}
            <div
              className="absolute top-4 left-4 right-0 bottom-0 rounded-[32px] -z-10"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(200, 178, 115,0.05)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.03)',
                transform: 'rotate(2deg) translateY(8px)',
              }}
            />
            <div
              className="absolute top-8 left-8 right-0 bottom-0 rounded-[32px] -z-20"
              style={{
                background: 'rgba(255,255,255,0.35)',
                border: '1px solid rgba(200, 178, 115,0.03)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                transform: 'rotate(4deg) translateY(16px)',
              }}
            />

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === active ? 'w-8 bg-[#C8B273]' : 'w-2 bg-[#C8B273]/20 hover:bg-[#C8B273]/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Mobile: Horizontal scroll */}
          <div
            ref={scrollRef}
            className="flex lg:hidden gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((t, i) => (
              <div key={i} className="min-w-[88%] sm:min-w-[75%] snap-start">
                <TestimonialCard testimonial={t} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── TESTIMONIAL CARD ── */
function TestimonialCard({ testimonial: t }: { testimonial: typeof testimonials[0] }) {
  return (
    <div
      className="rounded-[32px] p-5 md:p-8 border relative overflow-hidden"
      style={{
        background: 'var(--mc-bg-card)',
        borderColor: 'var(--mc-border)',
        boxShadow: '0 18px 45px rgba(0,0,0,0.05)',
      }}
    >
      {/* Decorative quote */}
      <div className="absolute top-6 right-7 text-[#C8B273]/[0.06]">
        <Quote className="w-16 h-16" />
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1.5 mb-5">
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} className="w-[18px] h-[18px] text-[#F4B740] fill-current" />
        ))}
        <span className="text-[14px] font-semibold ml-1.5" style={{ color: 'var(--mc-text-heading)' }}>
          {t.rating}.0
        </span>
      </div>

      {/* Testimonial text */}
      <p className="text-[15px] leading-7 md:text-[16px] md:leading-[1.9] mt-4 italic relative z-10" style={{ color: 'var(--mc-text-body)' }}>
        &ldquo;{t.text}&rdquo;
      </p>

      {/* Product tag */}
      {t.product && (
        <div className="mt-5">
          <span
            className="inline-flex items-center text-[13px] font-semibold text-[#C8B273] px-4 py-1.5 rounded-full"
            style={{ background: 'rgba(200, 178, 115,0.10)' }}
          >
            Purchased: {t.product}
          </span>
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-3.5 mt-6 pt-6 border-t border-[rgba(200, 178, 115,0.06)]">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 border-2"
          style={{ background: t.avatar, borderColor: 'rgba(200, 178, 115,0.18)' }}
        >
          <span className="text-white text-[20px] font-bold">{t.initial}</span>
        </div>
        <div>
          <p className="text-[18px] font-bold" style={{ color: 'var(--mc-text-heading)' }}>{t.name}</p>
          <p className="text-[14px]" style={{ color: 'var(--mc-text-muted)' }}>{t.location}</p>
        </div>
      </div>
    </div>
  );
}
