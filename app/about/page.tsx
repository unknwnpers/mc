import { Heart, MapPin, Star, ArrowLeft, Sparkles, Box, ShieldCheck, Zap, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Soft, Breathable Fabrics',
      description: 'Carefully selected materials suitable for Kerala weather and sensitive skin.',
      color: 'bg-rose-50 text-rose-500'
    },
    {
      icon: Star,
      title: 'Curated Essentials',
      description: 'Thoughtfully chosen products for mothers and babies that prioritize comfort.',
      color: 'bg-amber-50 text-amber-500'
    },
    {
      icon: ShieldCheck,
      title: 'Everyday Comfort',
      description: 'Simple, comfortable designs made for daily use without compromising on style.',
      color: 'bg-emerald-50 text-emerald-500'
    },
    {
      icon: Zap,
      title: 'Trusted Local Store',
      description: 'Personalized support from our Kochi-based team who understand your needs.',
      color: 'bg-indigo-50 text-indigo-500'
    },
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F7] selection:bg-[#C8B273]/20">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">

        {/* HEADER SECTION */}
        <div className="relative text-center mb-24 md:mb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-24 h-24 bg-[#C8B273]/5 rounded-full blur-3xl" />
          <p className="text-[13px] font-black text-[#C8B273] uppercase tracking-[0.3em] mb-4 relative z-10">Our Essence</p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#3B312C] mb-8 tracking-tighter relative z-10">
            About <span className="text-[#C8B273] italic">Miks & Chiks</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 max-w-3xl mx-auto leading-relaxed font-sans font-medium">
            At Miks & Chiks, we believe that comfort is not a luxury — it's essential, especially for mothers and children.
          </p>
        </div>

        {/* STORY SECTION */}
        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center mb-32 md:mb-48">

          <div className="relative">
            <div className="absolute -inset-6 bg-[#F8F4EE]/40 rounded-[60px] -rotate-3 blur-2xl" />
            <div className="relative group overflow-hidden rounded-[50px] shadow-2xl shadow-[#3B312C]/5 border border-[#F3E8E5]">
              <Image
                src="/pregnant-lady.jpg"
                alt="Our Story"
                width={700}
                height={600}
                className="w-full h-[500px] md:h-[650px] object-cover object-top transform group-hover:scale-105 transition-transform duration-1000"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3B312C]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            {/* Floating decoration */}
            <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-[32px] shadow-xl border border-[#F3E8E5] hidden md:block animate-bounce-slow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                  <Heart className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Founded in</p>
                  <p className="text-lg font-serif font-bold text-[#3B312C] leading-none">Kochi, Kerala</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <p className="text-[11px] font-black text-[#C8B273] uppercase tracking-[0.3em] mb-3">Our Heritage</p>
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3B312C] tracking-tight leading-[1.1]">
                A Journey of <br />
                <span className="text-[#C8B273] italic">Pure Comfort</span>
              </h2>
            </div>

            <div className="space-y-6 text-neutral-600 leading-relaxed text-lg font-sans">
              <p>
                Miks & Chiks was built with a simple goal — to make it easier for mothers to find clothing that truly feels good.
              </p>

              <p>
                We understand that during pregnancy and early motherhood, comfort matters more than ever. At the same time, you shouldn't have to compromise on style or quality. That's why our collection focuses on fabrics that are gentle on the skin, easy to wear, and suitable for daily use in our climate.
              </p>

              <p>
                Based in Kochi, we specialize in carefully selected maternity and kids wear designed to feel soft, breathable, and effortless for everyday life. Every product we offer is chosen with care, keeping both practicality and style in mind.
              </p>

              <div className="p-8 bg-white rounded-[40px] border border-[#F3E8E5] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <Sparkles className="w-24 h-24 text-[#3B312C]" />
                </div>
                <p className="font-bold text-[#3B312C] relative z-10">
                  "We are not just a store — we are a space where mothers can find reliable essentials without confusion or compromise."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VALUES SECTION */}
        <div className="mb-32 md:mb-48">
          <div className="text-center mb-16 md:mb-20">
            <p className="text-[11px] font-black text-[#C8B273] uppercase tracking-[0.3em] mb-3">Why Us</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-[#3B312C] tracking-tight">
              Our <span className="text-[#C8B273] italic">Core Values</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-[40px] p-10 border border-[#F3E8E5] shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 group"
              >
                <div className={cn(
                  "inline-flex items-center justify-center w-16 h-16 rounded-[24px] mb-8 border border-current border-opacity-5 transform group-hover:rotate-6 transition-transform duration-500 shadow-inner",
                  value.color
                )}>
                  <value.icon className="h-8 w-8" />
                </div>

                <h3 className="text-xl font-serif font-bold text-[#3B312C] mb-4">
                  {value.title}
                </h3>

                <p className="text-neutral-500 text-sm leading-relaxed font-sans font-medium">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA SECTION */}
        <div className="relative overflow-hidden bg-[#3B312C] rounded-[60px] p-12 md:p-24 text-center shadow-2xl shadow-[#3B312C]/20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8B273] opacity-10 blur-[150px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white opacity-[0.02] blur-[100px] translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-4xl mx-auto">
            <p className="text-[11px] font-black text-[#C8B273] uppercase tracking-[0.4em] mb-6">Experience it yourself</p>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 tracking-tight">
              Join the <span className="text-[#C8B273] italic">Experience</span>
            </h2>

            <p className="text-neutral-400 text-lg md:text-xl mb-12 font-sans leading-relaxed max-w-2xl mx-auto font-medium">
              Visit our boutique in Kochi or explore our curated collection online. We're here to help you choose what feels right.
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <a
                href="/contact"
                className="inline-flex items-center gap-4 bg-[#C8B273] text-white px-10 py-5 rounded-[24px] hover:bg-[#B89B5E] transition-all duration-500 font-black uppercase tracking-widest text-xs shadow-xl shadow-[#C8B273]/20 transform hover:-translate-y-1 active:scale-95"
              >
                <MapPin className="w-4 h-4" />
                Get Directions
              </a>

              <a
                href="/products"
                className="inline-flex items-center gap-4 bg-white/5 text-white px-10 py-5 rounded-[24px] hover:bg-white hover:text-[#3B312C] transition-all duration-500 font-black uppercase tracking-widest text-xs border border-white/10 transform hover:-translate-y-1 active:scale-95"
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