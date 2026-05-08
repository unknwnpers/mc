"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Star, Heart, Truck, ShieldCheck, RefreshCw, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';

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
  return (
    <section
      className="relative overflow-hidden flex items-center min-h-[620px] md:min-h-[760px] pt-[130px] md:pt-[130px] pb-12 md:pb-24"
      style={{ background: 'linear-gradient(180deg, #FFF9F6 0%, #FDF5F1 100%)' }}
    >
      {/* ── Background decoration ── */}
      <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-[#E9897E]/[0.03] blur-[100px] pointer-events-none hidden md:block" />
      <div className="absolute bottom-[-150px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#FDF5F1] blur-[80px] pointer-events-none hidden md:block" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#E9897E]/[0.015] blur-[120px] pointer-events-none hidden md:block" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ═══════════════════════════════════════════ */}
          {/* LEFT CONTENT                                */}
          {/* ═══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-[560px] order-2 lg:order-1 text-center lg:text-left mx-auto lg:mx-0"
          >
            {/* Welcome Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 mx-auto lg:ml-0"
              style={{ background: 'rgba(233,137,126,0.10)' }}
            >
              <Heart className="w-3.5 h-3.5 text-[#E9897E] fill-current" />
              <span className="text-[12px] font-semibold tracking-[0.08em] text-[#E9897E] uppercase">
                Welcome to Miks & Chiks
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease }}
              className="font-serif font-bold text-[36px] sm:text-[42px] md:text-[58px] lg:text-[72px] leading-[1.08] tracking-tight text-[#1E1E1E] mb-3"
            >
              {content.headline || "Softness That"}
              <span
                className="block mt-1"
                style={{
                  background: 'linear-gradient(90deg, #E9897E, #C86B5F)',
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
              className="font-serif italic text-[20px] md:text-[24px] text-[#5C5C5C] mb-0"
            >
              {content.subheadline || "Through Every Tiny Moment"}
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
              className="text-[16px] md:text-[18px] leading-[1.8] text-[#5C5C5C] mt-6 max-w-[480px] mx-auto lg:ml-0"
            >
              {content.description || "Thoughtfully designed maternity & kids wear crafted with the softest fabrics, bringing comfort, elegance and joy to every moment of motherhood."}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6, ease }}
              className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 mt-8"
            >
              <Link
                href={content.buttonLink || "/products"}
                className="group inline-flex items-center justify-center gap-2.5 bg-[#E9897E] text-white font-semibold text-[15px] h-[54px] px-8 rounded-xl hover:bg-[#C86B5F] active:scale-[0.97] shadow-[0_8px_24px_rgba(233,137,126,0.25)] hover:shadow-[0_14px_36px_rgba(233,137,126,0.30)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {content.buttonText || "Shop Collection"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center bg-white text-[#1E1E1E] font-semibold text-[15px] h-[54px] px-8 rounded-xl border border-[rgba(233,137,126,0.12)] hover:bg-[#E9897E] hover:text-white hover:border-[#E9897E] active:scale-[0.97] transition-all duration-300"
              >
                Explore Story
              </Link>
            </motion.div>

            {/* Trust Features Row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.75 }}
              className="flex flex-wrap justify-center lg:justify-start gap-x-5 md:gap-x-8 gap-y-3 mt-8 md:mt-10 pt-6 md:pt-8 border-t border-[rgba(233,137,126,0.08)]"
            >
              {[
                { icon: Truck, text: "Free Shipping" },
                { icon: Banknote, text: "COD Available" },
                { icon: RefreshCw, text: "Easy Returns" },
                { icon: ShieldCheck, text: "Secure Payments" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-[#E9897E]" />
                  <span className="text-[14px] font-semibold text-[#1E1E1E]">{item.text}</span>
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
            className="relative order-1 lg:order-2 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[520px] aspect-[4/5] group">
              {/* Main Image */}
              <div
                className="relative w-full h-full rounded-[24px] md:rounded-[36px] overflow-hidden"
                style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.06)' }}
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
                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-[#FDF5F1]/30 to-transparent pointer-events-none" />
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
                  className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-[rgba(233,137,126,0.08)]"
                  style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Tiny avatars */}
                    <div className="flex -space-x-2.5">
                      {[
                        'bg-[#F4B5AD]',
                        'bg-[#E9897E]',
                        'bg-[#C86B5F]',
                      ].map((bg, i) => (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border-[2.5px] border-white ${bg} flex items-center justify-center`}
                        >
                          <span className="text-white text-[10px] font-bold">
                            {['P', 'A', 'D'][i]}
                          </span>
                        </div>
                      ))}
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-white bg-[#FFF0EE] flex items-center justify-center">
                        <span className="text-[#E9897E] text-[9px] font-bold">+</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1E1E1E] leading-tight">Trusted by</p>
                      <p className="text-[13px] font-bold text-[#E9897E] leading-tight">10,000+ Moms</p>
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
                  className="bg-white/90 backdrop-blur-xl rounded-2xl p-5 border border-[rgba(233,137,126,0.08)]"
                  style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-[15px] font-bold text-[#1E1E1E]">4.8/5 Reviews</p>
                  <p className="text-[12px] text-[#8A8A8A] font-medium">From 500+ Reviews</p>
                </motion.div>
              </motion.div>

              {/* Decorative glows behind image */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#E9897E]/[0.04] rounded-full blur-2xl -z-10" />
              <div className="absolute -bottom-14 -left-14 w-48 h-48 bg-[#FDF5F1]/60 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
