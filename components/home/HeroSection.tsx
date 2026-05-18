"use client";

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Star, Heart, Truck, ShieldCheck, RefreshCw, Banknote } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

interface HeroSectionProps {
  heroImageUrl: string;
  content?: {
    headline?: string;
    headlineHighlight?: string;
    subheadline?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
  };
}

export default function HeroSection({ heroImageUrl, content = {} }: HeroSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  // Parallax transform values (pixels to move vertically during scroll)
  // Very subtle (5-20px) for premium feel without noise
  const textY = useTransform(scrollYProgress, [0, 1], [0, 10]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 5]);
  const bgDecorY = useTransform(scrollYProgress, [0, 1], [0, 20]);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden w-full max-w-full flex items-center min-h-[620px] md:min-h-[800px] pt-[160px] md:pt-[180px] pb-16 md:pb-32"
      style={{ background: 'var(--mc-bg-base)' }}
    >
      {/* ── Background decoration ── */}
      <motion.div style={{ y: bgDecorY }} className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-[#C8B273]/[0.03] blur-[100px] pointer-events-none hidden md:block" />
      <motion.div style={{ y: bgDecorY }} className="absolute bottom-[-150px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#F8F4EE] blur-[80px] pointer-events-none hidden md:block" />
      <motion.div style={{ y: bgDecorY }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#C8B273]/[0.015] blur-[120px] pointer-events-none hidden md:block" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">

          {/* ═══════════════════════════════════════════ */}
          {/* LEFT CONTENT                                */}
          {/* ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ y: textY }}
            className="max-w-[560px] order-2 lg:order-1 text-center lg:text-left mx-auto lg:mx-0"
          >
            {/* Welcome Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 mx-auto lg:ml-0"
              style={{ background: 'var(--mc-bg-card)' }}
            >
              <Heart className="w-3.5 h-3.5 text-[var(--mc-gold)] fill-current" />
              <span className="text-[12px] font-semibold tracking-[1px] text-[var(--mc-gold)] uppercase">
                Welcome to Miks & Chiks
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease }}
              className="font-serif font-bold text-[40px] md:text-[56px] lg:text-[72px] leading-[1.15] tracking-tight text-[#3B312C] mb-4"
            >
              {content.headline || "Softness That"}
              <span
                className="block mt-2"
                style={{
                  background: 'linear-gradient(90deg, #C8B273, #B89B5E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {content.headlineHighlight || "Stays With You"}
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4, ease }}
              className="font-serif italic text-[16px] md:text-[20px] text-[#6E625B] mb-0"
            >
              {content.subheadline || "Through Every Tiny Moment"}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="text-[15px] md:text-[18px] leading-[2] text-[#6E625B] mt-8 max-w-[480px] mx-auto lg:ml-0"
            >
              {content.description || "Premium maternity & newborn wear — custom-stitched to your measurements, crafted with the softest fabrics for comfort, elegance and joy through every stage of motherhood."}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease }}
              className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-4 mt-10"
            >
              <Link
                href={content.buttonLink || "/products"}
                className="group inline-flex items-center justify-center gap-2.5 bg-[#C8B273] text-white font-semibold text-[15px] h-[52px] md:h-[60px] w-full sm:w-auto px-10 rounded-xl hover:bg-[#B89B5E] active:scale-[0.97] shadow-[0_8px_24px_rgba(200,178,115,0.25)] hover:shadow-[0_14px_36px_rgba(200,178,115,0.30)] hover:-translate-y-0.5 transition-all duration-300 ease-out"
              >
                {content.buttonText || "Shop Collection"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/contact?type=custom-order"
                className="inline-flex items-center justify-center bg-transparent text-[#C8B273] font-semibold text-[15px] h-[52px] md:h-[60px] w-full sm:w-auto px-10 rounded-xl border border-[#C8B273] hover:bg-[rgba(200,178,115,0.1)] active:scale-[0.97] transition-all duration-300 ease-out"
              >
                Book Custom Stitching
              </Link>
            </motion.div>

            {/* Trust Features Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="grid grid-cols-2 sm:flex flex-wrap justify-start gap-4 md:gap-8 mt-10 md:mt-12 pt-8 md:pt-10 border-t border-[rgba(200,178,115,0.12)]"
            >
              {[
                { icon: Truck, text: "Free Shipping" },
                { icon: Banknote, text: "COD Available" },
                { icon: RefreshCw, text: "Easy Replacement" },
                { icon: ShieldCheck, text: "Secure Payments" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-[#C8B273]" />
                  <span className="text-[14px] font-semibold text-[#3B312C]">{item.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ═══════════════════════════════════════════ */}
          {/* RIGHT IMAGE                                 */}
          {/* ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            style={{ y: imageY }}
            className="relative order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[520px] aspect-[4/5] max-h-[420px] md:max-h-none group mt-10 lg:mt-0">
              {/* Main Image */}
              <div
                className="relative w-full h-full rounded-[24px] md:rounded-[36px] overflow-hidden border border-[#F0E7DD]"
                style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.04)' }}
              >
                <Image
                  src={heroImageUrl}
                  alt="Premium maternity and kids fashion — Miks & Chiks"
                  fill
                  priority
                  sizes="(max-width: 768px) 90vw, (max-width: 1024px) 50vw, 520px"
                  className="object-cover object-top group-hover:scale-[1.03] transition-transform duration-[2s] ease-out"
                />
                {/* Soft glow overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-[#F8F4EE]/40 to-transparent pointer-events-none" />
              </div>

              {/* ── FLOATING CARD 1: Trusted by Moms (bottom-left) ── */}
              <motion.div
                initial={{ opacity: 0, x: -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9, ease }}
                className="absolute -bottom-4 -left-4 lg:-left-10 z-20 hidden md:block"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-[#FFFCF9]/95 backdrop-blur-xl rounded-2xl p-5 border border-[#F0E7DD]"
                  style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Tiny avatars */}
                    <div className="flex -space-x-2.5">
                      {[
                        'bg-[#E8DDB8]',
                        'bg-[#C8B273]',
                        'bg-[#B89B5E]',
                      ].map((bg, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border-[2.5px] border-white ${bg} flex items-center justify-center`}
                        >
                          <span className="text-[#3B312C] text-[10px] font-bold">
                            {['P', 'A', 'D'][i]}
                          </span>
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-white bg-[#FDFCF9] flex items-center justify-center">
                        <span className="text-[#C8B273] text-[9px] font-bold">+</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#3B312C] leading-tight">Trusted by</p>
                      <p className="text-[13px] font-bold text-[#C8B273] leading-tight">10,000+ Moms</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* ── FLOATING CARD 2: Rating (bottom-right) ── */}
              <motion.div
                initial={{ opacity: 0, x: 20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1, ease }}
                className="absolute -bottom-2 -right-2 lg:-right-8 z-20 hidden md:block"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="bg-[#FFFCF9]/95 backdrop-blur-xl rounded-2xl p-5 border border-[#F0E7DD]"
                  style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-3.5 h-3.5 text-[#C8B273] fill-current" />
                    ))}
                  </div>
                  <p className="text-[15px] font-bold text-[#3B312C]">4.8/5 Reviews</p>
                  <p className="text-[12px] text-[#B8A89A] font-medium">From 500+ Reviews</p>
                </motion.div>
              </motion.div>

              {/* Decorative glows behind image */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C8B273]/[0.04] rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-14 -left-14 w-48 h-48 bg-[#F8F4EE]/60 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
