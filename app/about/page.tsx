"use client";

import { useEffect, useState } from 'react';
import { Heart, MapPin, Star, Sparkles, ShieldCheck, Zap, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const DEFAULT_IMAGE = "/pregnant-lady.jpg";

const values = [
  {
    icon: Heart,
    title: 'Soft, Breathable Fabrics',
    description: 'Carefully selected materials suitable for Kerala weather and sensitive skin.',
    iconBg: 'rgba(244,63,94,0.08)',
    iconColor: '#F43F5E',
  },
  {
    icon: Star,
    title: 'Curated Essentials',
    description: 'Thoughtfully chosen products for mothers and babies that prioritize comfort.',
    iconBg: 'rgba(245,158,11,0.08)',
    iconColor: '#F59E0B',
  },
  {
    icon: ShieldCheck,
    title: 'Everyday Comfort',
    description: 'Simple, comfortable designs made for daily use without compromising on style.',
    iconBg: 'rgba(16,185,129,0.08)',
    iconColor: '#10B981',
  },
  {
    icon: Zap,
    title: 'Trusted Local Store',
    description: 'Personalized support from our Kochi-based team who understand your needs.',
    iconBg: 'rgba(99,102,241,0.08)',
    iconColor: '#6366F1',
  },
];

export default function AboutPage() {
  const [storyImage, setStoryImage] = useState<string>(DEFAULT_IMAGE);

  useEffect(() => {
    fetch("/api/settings/about-page")
      .then((r) => r.json())
      .then((data) => {
        const url = data?.config?.imageUrl;
        if (url) setStoryImage(url);
      })
      .catch(() => {/* keep default */});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--mc-bg-base)' }}>
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">

        {/* ── HEADER ── */}
        <div className="relative text-center mb-24 md:mb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-24 h-24 rounded-full blur-3xl" style={{ background: 'var(--mc-gold)', opacity: 0.06 }} />
          <p className="text-[13px] font-black uppercase tracking-[0.3em] mb-4 relative z-10" style={{ color: 'var(--mc-gold)' }}>Our Essence</p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8 tracking-tighter relative z-10" style={{ color: 'var(--mc-text-heading)' }}>
            About <span className="italic" style={{ color: 'var(--mc-gold)' }}>Miks &amp; Chiks</span>
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-sans font-medium" style={{ color: 'var(--mc-text-body)' }}>
            At Miks &amp; Chiks, we believe that comfort is not a luxury — it&apos;s essential, especially for mothers and children.
          </p>
        </div>

        {/* ── STORY SECTION ── */}
        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center mb-32 md:mb-48">

          <div className="relative">
            <div className="absolute -inset-6 rounded-[60px] -rotate-3 blur-2xl opacity-40" style={{ background: 'var(--mc-bg-section)' }} />
            <div
              className="relative group overflow-hidden rounded-[50px] shadow-2xl"
              style={{ border: '1px solid var(--mc-border)' }}
            >
              <Image
                src={storyImage}
                alt="Our Story"
                width={700}
                height={600}
                className="w-full h-[500px] md:h-[650px] object-cover object-top transform group-hover:scale-105 transition-transform duration-1000"
                priority
                unoptimized={storyImage.startsWith("http")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            {/* Floating badge */}
            <div
              className="absolute -bottom-8 -right-8 p-6 rounded-[32px] shadow-xl hidden md:block animate-bounce-slow"
              style={{ background: 'var(--mc-bg-card)', border: '1px solid var(--mc-border)' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.08)', color: '#F43F5E' }}>
                  <Heart className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--mc-text-muted)' }}>Founded in</p>
                  <p className="text-lg font-serif font-bold leading-none" style={{ color: 'var(--mc-text-heading)' }}>Kochi, Kerala</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--mc-gold)' }}>Our Heritage</p>
              <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.1]" style={{ color: 'var(--mc-text-heading)' }}>
                A Journey of <br />
                <span className="italic" style={{ color: 'var(--mc-gold)' }}>Pure Comfort</span>
              </h2>
            </div>

            <div className="space-y-6 leading-relaxed text-lg font-sans" style={{ color: 'var(--mc-text-body)' }}>
              <p>
                Miks &amp; Chiks was built with a simple goal — to make it easier for mothers to find clothing that truly feels good.
              </p>
              <p>
                We understand that during pregnancy and early motherhood, comfort matters more than ever. At the same time, you shouldn&apos;t have to compromise on style or quality. That&apos;s why our collection focuses on fabrics that are gentle on the skin, easy to wear, and suitable for daily use in our climate.
              </p>
              <p>
                Based in Kochi, we specialize in carefully selected maternity and kids wear designed to feel soft, breathable, and effortless for everyday life. Every product we offer is chosen with care, keeping both practicality and style in mind.
              </p>

              {/* Quote card */}
              <div
                className="p-8 rounded-[40px] relative overflow-hidden group"
                style={{ background: 'var(--mc-bg-card)', border: '1px solid var(--mc-border)' }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <Sparkles className="w-24 h-24" style={{ color: 'var(--mc-gold)' }} />
                </div>
                <p className="font-bold relative z-10" style={{ color: 'var(--mc-text-heading)' }}>
                  &quot;We are not just a store — we are a space where mothers can find reliable essentials without confusion or compromise.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── VALUES SECTION ── */}
        <div className="mb-32 md:mb-48">
          <div className="text-center mb-16 md:mb-20">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--mc-gold)' }}>Why Us</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight" style={{ color: 'var(--mc-text-heading)' }}>
              Our <span className="italic" style={{ color: 'var(--mc-gold)' }}>Core Values</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="rounded-[40px] p-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 group"
                style={{ background: 'var(--mc-bg-card)', border: '1px solid var(--mc-border)' }}
              >
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] mb-8 transform group-hover:rotate-6 transition-transform duration-500"
                  style={{ background: value.iconBg, color: value.iconColor }}
                >
                  <value.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-serif font-bold mb-4" style={{ color: 'var(--mc-text-heading)' }}>
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed font-sans font-medium" style={{ color: 'var(--mc-text-body)' }}>
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA SECTION ── */}
        <div
          className="relative overflow-hidden rounded-[60px] p-12 md:p-24 text-center shadow-2xl"
          style={{ background: 'var(--mc-charcoal)' }}
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" style={{ background: 'var(--mc-gold)', opacity: 0.12 }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" style={{ background: 'var(--mc-bg-card)', opacity: 0.03 }} />

          <div className="relative z-10 max-w-4xl mx-auto">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-6" style={{ color: 'var(--mc-gold)' }}>Experience it yourself</p>
            <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8 tracking-tight" style={{ color: 'var(--mc-bg-base)' }}>
              Join the <span className="italic" style={{ color: 'var(--mc-gold)' }}>Experience</span>
            </h2>
            <p className="text-lg md:text-xl mb-12 font-sans leading-relaxed max-w-2xl mx-auto font-medium" style={{ color: 'var(--mc-text-muted)' }}>
              Visit our boutique in Kochi or explore our curated collection online. We&apos;re here to help you choose what feels right.
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="/contact"
                className="inline-flex items-center gap-4 px-10 py-5 rounded-[24px] transition-all duration-500 font-black uppercase tracking-widest text-xs shadow-xl transform hover:-translate-y-1 active:scale-95"
                style={{ background: 'var(--mc-gold)', color: 'var(--mc-charcoal)' }}
              >
                <MapPin className="w-4 h-4" />
                Get Directions
              </a>
              <a
                href="/products"
                className="inline-flex items-center gap-4 px-10 py-5 rounded-[24px] transition-all duration-500 font-black uppercase tracking-widest text-xs transform hover:-translate-y-1 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--mc-bg-base)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <ShoppingBag className="w-4 h-4" />
                Shop Online
              </a>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}