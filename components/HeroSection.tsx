import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Gift, Heart, ShieldCheck, Leaf, Truck, RefreshCw, Headphones, Crown } from 'lucide-react';

export default function HeroSection({ heroImageUrl }: { heroImageUrl?: string }) {
  return (
    <section className="relative pt-32 pb-24 min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FFF8F6] via-[#FFF1EC] to-[#FDF7F4]">
      
      {/* ================= LUXURY DECORATIONS ================= */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Glowing Orbs for Depth */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[#F48C7F]/10 to-transparent rounded-full blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-[-100px] w-[500px] h-[500px] bg-gradient-to-tr from-[#D4A373]/10 to-transparent rounded-full blur-[80px] mix-blend-multiply"></div>
        
        {/* Animated Confetti Particles */}
        <div className="absolute top-[10%] left-[15%] w-2 h-2 bg-[#D4A373] rounded-sm rotate-45 animate-[pulse_4s_ease-in-out_infinite_alternate] opacity-60"></div>
        <div className="absolute top-[20%] right-[30%] w-3 h-1 bg-[#F48C7F] rounded-full -rotate-12 animate-[pulse_3s_ease-in-out_infinite_alternate] opacity-50"></div>
        <div className="absolute bottom-[30%] left-[25%] w-2 h-2 bg-[#D4A373] rounded-full animate-[pulse_5s_ease-in-out_infinite_alternate] opacity-40"></div>
        <div className="absolute top-[40%] right-[10%] w-2 h-2 bg-[#F48C7F] rounded-sm rotate-12 animate-[pulse_6s_ease-in-out_infinite_alternate] opacity-50"></div>
      </div>

      {/* Container */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-10 relative z-10 w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-16 lg:gap-12 items-center">
          
          {/* ================= LEFT SIDE (Content Block) ================= */}
          <div className="flex flex-col items-center text-center space-y-8 relative w-full lg:pl-4">
            
            {/* A. Top Ribbon Badge */}
            <div className="relative inline-flex items-center justify-center w-fit mb-2 group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
              <div className="relative flex items-center space-x-2 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] text-white px-8 py-2.5 rounded-full shadow-[0_8px_20px_rgba(244,140,127,0.25)] border border-white/20">
                <span className="text-white/90 text-lg leading-none animate-pulse">✦</span>
                <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] px-1 text-white text-shadow-sm">
                  We&apos;re Open!
                </span>
                <span className="text-white/90 text-lg leading-none animate-pulse">✦</span>
              </div>
              {/* Luxury Ribbon tails */}
              <div className="absolute top-1/2 -left-4 w-10 h-8 bg-[#D16A5E] -z-10 -translate-y-1/2 rounded-l flex items-center shadow-inner" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 25% 50%)' }}></div>
              <div className="absolute top-1/2 -right-4 w-10 h-8 bg-[#D16A5E] -z-10 -translate-y-1/2 rounded-r flex items-center shadow-inner" style={{ clipPath: 'polygon(0 0, 100% 0, 75% 50%, 100% 100%, 0 100%)' }}></div>
              {/* Dark folds */}
              <div className="absolute -bottom-[3px] left-4 w-3 h-3 bg-[#9B392F] rotate-45 -z-20"></div>
              <div className="absolute -bottom-[3px] right-4 w-3 h-3 bg-[#9B392F] rotate-45 -z-20"></div>
            </div>

            {/* B. Main Heading */}
            <div className="space-y-0 flex flex-col items-center">
              <h1 className="font-serif text-[60px] sm:text-[72px] lg:text-[88px] leading-[0.95] text-[#2B2B2B] font-bold tracking-tight">
                Grand
              </h1>
              <h1 className="font-serif text-[68px] sm:text-[80px] lg:text-[104px] leading-[0.95] text-[#F48C7F] font-bold italic tracking-tight drop-shadow-sm">
                Opening!
              </h1>
            </div>

            {/* C. Subtitle */}
            <div className="flex flex-col items-center relative mt-2">
              <Heart className="w-5 h-5 text-[#D4A373] fill-[#D4A373]/20 mb-4 animate-[bounce_3s_infinite]" />
              <p className="text-[17px] sm:text-[20px] text-[#666666] font-serif italic max-w-[420px] leading-relaxed tracking-wide">
                A new beginning filled with love, care & little moments.
              </p>
            </div>

            {/* D. Feature Icons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8 w-full max-w-[640px]">
              <FeatureCard icon={<Gift className="w-6 h-6" />} title="Exclusive Launch Offers" delay="0ms" />
              <FeatureCard icon={<Heart className="w-6 h-6" />} title="Premium Quality You Can Trust" delay="100ms" />
              <FeatureCard icon={<Leaf className="w-6 h-6" />} title="Made With Love For Little Ones" delay="200ms" />
              <FeatureCard icon={<ShieldCheck className="w-6 h-6" />} title="Safe, Soft & Sustainable" delay="300ms" />
            </div>

            {/* E. CTA Buttons */}
            <div className="flex flex-wrap justify-center items-center gap-5 pt-4">
              <Link
                href="/products"
                className="group relative flex items-center space-x-3 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] text-white px-10 py-4.5 rounded-full font-bold shadow-[0_15px_30px_rgba(244,140,127,0.3)] hover:shadow-[0_20px_40px_rgba(244,140,127,0.4)] hover:-translate-y-1 transition-all duration-300 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="uppercase tracking-[0.2em] text-xs relative z-10">Shop Grand Opening</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform relative z-10" />
              </Link>

              <Link
                href="/products?category=maternity-wear"
                className="group flex items-center space-x-3 bg-white/50 backdrop-blur-sm text-[#2B2B2B] px-10 py-4.5 rounded-full font-bold border border-[#D4A373]/50 hover:bg-white hover:border-[#D4A373] hover:shadow-[0_10px_20px_rgba(212,163,115,0.1)] hover:-translate-y-1 transition-all duration-300 active:scale-95"
              >
                <span className="uppercase tracking-[0.2em] text-xs">Explore Collection</span>
              </Link>
            </div>

            {/* F. Bottom Info Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 mt-8 w-full max-w-[800px] bg-white/80 backdrop-blur-xl p-5 sm:px-10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white">
              <InfoBadge icon={<Truck className="w-5 h-5" />} title="Free Shipping" sub="On orders above ₹999" />
              <div className="hidden sm:block w-[1px] h-10 bg-neutral-200"></div>
              <InfoBadge icon={<RefreshCw className="w-5 h-5" />} title="Easy Returns" sub="Hassle-free returns" />
              <div className="hidden sm:block w-[1px] h-10 bg-neutral-200"></div>
              <InfoBadge icon={<Headphones className="w-5 h-5" />} title="Customer Support" sub="We're here for you" />
            </div>

          </div>

          {/* ================= RIGHT SIDE (Visual + Offer) ================= */}
          <div className="relative mt-16 lg:mt-0 flex justify-center lg:justify-end">
            
            {/* Background Gold Rings (Luxury Depth) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square z-0 pointer-events-none">
              <div className="absolute inset-[-25px] border-[2px] border-[#D4A373]/40 rounded-full"></div>
              <div className="absolute inset-[-10px] border border-[#D4A373]/30 rounded-full"></div>
            </div>

            {/* A. Main Image */}
            <div className="relative w-full max-w-[420px] aspect-square z-10 group">
              <div className="absolute inset-0 border-[8px] border-white rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.12)] overflow-hidden bg-[#FFF6F4] transform transition-transform duration-700 group-hover:scale-[1.02]">
                <Image
                  src={heroImageUrl || '/mother-baby.jpg'}
                  alt="Mother holding baby"
                  fill
                  priority
                  className="object-cover object-top hover:scale-105 transition-transform duration-1000 ease-out"
                />
                {/* Soft inner glow */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] pointer-events-none"></div>
              </div>

              {/* B. Decorative Floating Badge */}
              <div className="absolute -top-10 -left-10 z-20 animate-[float_6s_ease-in-out_infinite]">
                <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                  {/* Ribbon tails with realistic v-notch */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 w-full justify-center z-0">
                    <div className="w-8 h-12 bg-gradient-to-b from-[#D4A373] to-[#C08F5F] transform rotate-[5deg] origin-top-right shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                    <div className="w-8 h-12 bg-gradient-to-b from-[#D4A373] to-[#C08F5F] transform -rotate-[5deg] origin-top-left shadow-md" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)' }}></div>
                  </div>
                  {/* Scalloped Badge Body */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F48C7F] to-[#E76F61] rounded-full z-10 flex items-center justify-center shadow-[0_10px_20px_rgba(231,111,97,0.3)] border-[3px] border-white">
                    <div className="absolute inset-1.5 border-[2px] border-dashed border-white/60 rounded-full"></div>
                    <div className="relative flex flex-col items-center text-center text-white p-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5 text-white/90">Celebrate</span>
                      <span className="text-sm font-serif font-bold leading-tight tracking-wide">NEW<br/>BEGINNINGS</span>
                      <Heart className="w-3.5 h-3.5 text-white fill-white/50 mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Offer Card (Glassmorphism + Strong Depth) */}
              <div className="absolute -bottom-8 right-0 sm:right-0 z-30 bg-white/95 backdrop-blur-xl rounded-[24px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-white w-[260px] hover:-translate-y-3 transition-transform duration-500 ease-out group">
                <div className="flex flex-col items-center text-center relative z-10">
                  <Crown className="w-10 h-10 text-[#D4A373] mb-3 drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
                  <p className="text-[11px] font-bold text-[#F48C7F] uppercase tracking-[0.25em] mb-4">
                    Grand Opening Offer
                  </p>

                  <div className="flex flex-col items-center mb-4">
                    <span className="text-xs font-bold text-neutral-400 tracking-[0.2em] uppercase mb-1">Flat</span>
                    <div className="flex items-baseline justify-center">
                      <span className="font-serif text-[72px] leading-none text-[#2B2B2B] font-bold tracking-tighter">25</span>
                      <div className="flex flex-col items-start ml-1">
                        <span className="text-[32px] font-serif text-[#2B2B2B] leading-none">%</span>
                        <span className="text-xl font-bold text-[#F48C7F] leading-none tracking-widest mt-1">OFF</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] font-bold text-[#555555] uppercase tracking-[0.2em] mb-5">
                    On Selected Items
                  </p>

                  <div className="w-full h-px border-t border-dashed border-[#D4A373]/50 mb-5 relative">
                    <Heart className="w-3.5 h-3.5 text-[#D4A373] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                  </div>

                  <button className="bg-gradient-to-r from-[#D4A373] to-[#C08F5F] text-white text-[10px] font-bold px-6 py-2.5 rounded-full uppercase tracking-[0.2em] shadow-md hover:shadow-lg transition-shadow w-full">
                    Limited Time Only!
                  </button>
                </div>
                
                {/* Optional Gift box luxury hint */}
                <div className="absolute -bottom-8 -right-6 opacity-[0.15] rotate-12 pointer-events-none group-hover:rotate-0 transition-transform duration-700">
                  <Gift className="w-20 h-20 text-[#D4A373]" />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}} />
    </section>
  );
}

// Reusable Sub-components

function FeatureCard({ icon, title, delay }: { icon: React.ReactNode; title: string; delay: string }) {
  return (
    <div 
      className="flex flex-col items-center text-center p-5 bg-white/60 backdrop-blur-sm rounded-[20px] hover:bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-300 border border-white"
      style={{ animationDelay: delay }}
    >
      <div className="text-[#F48C7F] mb-3 p-3 bg-[#FFF6F4] rounded-full shadow-inner">
        {icon}
      </div>
      <span className="text-[12px] font-bold text-[#2B2B2B] leading-snug px-1 tracking-wide">
        {title}
      </span>
    </div>
  );
}

function InfoBadge({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3.5 group cursor-default">
      <div className="bg-[#FFF6F4] text-[#F48C7F] p-3 rounded-full shrink-0 group-hover:scale-110 group-hover:bg-[#F48C7F] group-hover:text-white transition-all duration-300 shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-[#2B2B2B] uppercase tracking-wider">{title}</span>
        <span className="text-[11px] text-[#777777] font-medium tracking-wide">{sub}</span>
      </div>
    </div>
  );
}
