import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Gift, Heart, ShieldCheck, Leaf, Truck, RefreshCw, Headphones, Crown } from 'lucide-react';

export default function HeroSection({ heroImageUrl }: { heroImageUrl?: string }) {
  return (
    <section className="relative pt-32 pb-20 min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#FFF8F6] to-[#FFF1EC]">
      {/* Container */}
      <div className="max-w-[1320px] mx-auto px-6 md:px-10 relative z-10 w-full">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 lg:gap-8 items-center">

          {/* ================= LEFT SIDE (Content Block) ================= */}
          <div className="flex flex-col items-center text-center space-y-6 lg:space-y-8 relative w-full">
            
            {/* A. Top Ribbon Badge */}
            <div className="relative inline-flex items-center justify-center w-fit mb-2">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] rounded-full blur-md opacity-40"></div>
              <div className="relative flex items-center space-x-2 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] text-white px-8 py-2.5 rounded-full shadow-md border border-white/20">
                <span className="text-white text-lg leading-none">✦</span>
                <span className="text-sm font-bold uppercase tracking-[0.2em] px-1">
                  We&apos;re Open!
                </span>
                <span className="text-white text-lg leading-none">✦</span>
              </div>
              {/* Ribbon tails */}
              <div className="absolute top-1/2 -left-3 w-8 h-8 bg-[#D16A5E] rotate-45 -z-10 -translate-y-1/2"></div>
              <div className="absolute top-1/2 -right-3 w-8 h-8 bg-[#D16A5E] rotate-45 -z-10 -translate-y-1/2"></div>
            </div>

            {/* B. Main Heading */}
            <div className="space-y-1 flex flex-col items-center">
              <h1 className="font-serif text-[56px] sm:text-[64px] lg:text-[80px] leading-[1.0] text-[#2B2B2B] font-bold">
                Grand
              </h1>
              <h1 className="font-serif text-[64px] sm:text-[72px] lg:text-[96px] leading-[1.0] text-[#F48C7F] font-bold">
                Opening!
              </h1>
            </div>

            {/* C. Subtitle */}
            <div className="flex flex-col items-center relative">
              <Heart className="w-5 h-5 text-[#D4A373] fill-[#D4A373] mb-4" />
              <p className="text-[16px] sm:text-[20px] text-[#777777] font-serif italic max-w-[400px] leading-relaxed">
                A new beginning filled with love, care & little moments.
              </p>
            </div>

            {/* D. Feature Icons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 w-full max-w-[600px]">
              <FeatureCard icon={<Gift className="w-6 h-6" />} title="Exclusive Launch Offers" />
              <FeatureCard icon={<Heart className="w-6 h-6" />} title="Premium Quality You Can Trust" />
              <FeatureCard icon={<Leaf className="w-6 h-6" />} title="Made With Love For Little Ones" />
              <FeatureCard icon={<ShieldCheck className="w-6 h-6" />} title="Safe, Soft & Sustainable" />
            </div>

            {/* E. CTA Buttons */}
            <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
              <Link
                href="/products"
                className="group flex items-center space-x-3 bg-gradient-to-r from-[#F48C7F] to-[#E76F61] text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-[#F48C7F]/30 hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
              >
                <span className="uppercase tracking-widest text-xs">Shop Grand Opening</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/products?category=maternity-wear"
                className="flex items-center space-x-3 bg-transparent text-[#2B2B2B] px-8 py-4 rounded-full font-bold border-2 border-[#D4A373] hover:bg-[#D4A373]/10 transition-all active:scale-95"
              >
                <span className="uppercase tracking-widest text-xs">Explore Collection</span>
              </Link>
            </div>

            {/* F. Bottom Info Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 mt-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-[#F48C7F]/10">
              <InfoBadge icon={<Truck className="w-5 h-5" />} title="Free Shipping" sub="On orders above ₹999" />
              <div className="hidden sm:block w-px h-10 bg-neutral-200"></div>
              <InfoBadge icon={<RefreshCw className="w-5 h-5" />} title="Easy Returns" sub="Hassle-free returns" />
              <div className="hidden sm:block w-px h-10 bg-neutral-200"></div>
              <InfoBadge icon={<Headphones className="w-5 h-5" />} title="Customer Support" sub="We're here for you" />
            </div>

          </div>

          {/* ================= RIGHT SIDE (Visual + Offer) ================= */}
          <div className="relative mt-12 lg:mt-0 flex justify-center lg:justify-end">

            {/* Background Gold Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] aspect-square border-[2px] border-[#D4A373]/30 rounded-full z-0 pointer-events-none"></div>

            {/* A. Main Image */}
            <div className="relative w-full max-w-[480px] aspect-[4/5] z-10">
              <div className="absolute inset-0 border-[8px] border-white rounded-[50%_/_40%] shadow-2xl overflow-hidden bg-[#FFF6F4]">
                <Image
                  src={heroImageUrl || '/mother-baby.jpg'}
                  alt="Mother holding baby"
                  fill
                  priority
                  className="object-cover object-top hover:scale-105 transition-transform duration-1000"
                />
              </div>

              {/* B. Decorative Floating Badge */}
              <div className="absolute -top-12 -left-12 z-20 animate-[bounce_4s_infinite]">
                <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                  {/* Ribbon tails */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-4 w-full justify-center z-0">
                    <div className="w-8 h-12 bg-gradient-to-b from-[#D4A373] to-[#C08F5F] transform rotate-12 origin-top-right relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-4 after:bg-[#FFF8F6] after:[clip-path:polygon(0_100%,50%_0,100%_100%)]"></div>
                    <div className="w-8 h-12 bg-gradient-to-b from-[#D4A373] to-[#C08F5F] transform -rotate-12 origin-top-left relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-4 after:bg-[#FFF8F6] after:[clip-path:polygon(0_100%,50%_0,100%_100%)]"></div>
                  </div>
                  {/* Scalloped Badge Body (using stacked rotated squares to mimic scalloped edges) */}
                  <div className="absolute inset-0 bg-[#E76F61] rounded-full z-10 flex items-center justify-center shadow-lg">
                    <div className="absolute inset-1 border-[2px] border-dashed border-[#FFF8F6]/80 rounded-full"></div>
                    <div className="relative flex flex-col items-center text-center text-white p-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Celebrate</span>
                      <span className="text-sm font-serif font-bold leading-tight">NEW<br/>BEGINNINGS</span>
                      <Heart className="w-3 h-3 text-white fill-white mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Confetti & Balloons Decorations */}
              <div className="absolute top-10 -right-10 w-24 h-32 bg-gradient-to-b from-[#D4A373] to-transparent opacity-20 rounded-full blur-xl pointer-events-none"></div>
              <div className="absolute bottom-20 -left-10 w-32 h-32 bg-gradient-to-tr from-[#F48C7F] to-transparent opacity-20 rounded-full blur-xl pointer-events-none"></div>

              {/* C. Offer Card */}
              <div className="absolute -bottom-10 right-0 sm:-right-10 z-30 bg-white rounded-[20px] p-6 shadow-2xl border-2 border-[#D4A373]/30 w-[240px] hover:-translate-y-2 transition-transform duration-500">
                <div className="flex flex-col items-center text-center relative">
                  <Crown className="w-8 h-8 text-[#D4A373] mb-2" />
                  <p className="text-[10px] font-bold text-[#F48C7F] uppercase tracking-[0.2em] mb-3">
                    Grand Opening Offer
                  </p>

                  <div className="flex flex-col items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Flat</span>
                    <div className="flex items-baseline">
                      <span className="font-serif text-[64px] leading-none text-[#2B2B2B] font-bold">25</span>
                      <div className="flex flex-col items-start ml-1">
                        <span className="text-3xl font-serif text-[#2B2B2B] leading-none">%</span>
                        <span className="text-xl font-bold text-[#F48C7F] leading-none">OFF</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-charcoal uppercase tracking-widest mb-4">
                    On Selected Items
                  </p>

                  <div className="w-full h-px border-t border-dashed border-[#D4A373] mb-4 relative">
                    <Heart className="w-3 h-3 text-[#D4A373] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5" />
                  </div>

                  <span className="bg-[#D4A373] text-white text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                    Limited Time Only!
                  </span>

                  {/* Optional Gift box illusion */}
                  <div className="absolute -bottom-10 -right-8 opacity-20 rotate-12 pointer-events-none">
                    <Gift className="w-16 h-16 text-[#F48C7F]" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Reusable Sub-components

function FeatureCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4 bg-[#FFF6F4] rounded-[16px] hover:bg-white hover:shadow-md transition-all duration-300 border border-[#F48C7F]/10">
      <div className="text-[#F48C7F] mb-3 p-2 bg-white rounded-full shadow-sm">
        {icon}
      </div>
      <span className="text-[11px] sm:text-xs font-bold text-[#2B2B2B] leading-tight px-1">
        {title}
      </span>
    </div>
  );
}

function InfoBadge({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-[#FFF6F4] text-[#F48C7F] p-2.5 rounded-full shrink-0">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-bold text-[#2B2B2B] uppercase tracking-wide">{title}</span>
        <span className="text-[10px] sm:text-xs text-[#777777]">{sub}</span>
      </div>
    </div>
  );
}
