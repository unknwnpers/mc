"use client";

import { Star, Heart, Sparkles, Smile, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const features = [
  {
    icon: Star,
    title: "Premium Quality",
    desc: "Curated fabrics with meticulous craftsmanship for lasting softness.",
  },
  {
    icon: Sparkles,
    title: "Thoughtful Designs",
    desc: "Every piece is designed with intention, blending style and function.",
  },
  {
    icon: Heart,
    title: "Comfort Always",
    desc: "Breathable, skin-friendly materials that feel gentle all day long.",
  },
  {
    icon: Smile,
    title: "Made for Moms",
    desc: "Born from real motherhood — by moms who truly understand.",
  },
  {
    icon: ShieldCheck,
    title: "Hassle-Free Shopping",
    desc: "Easy returns, COD available, and secure checkout every time.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease },
  },
};

export default function TrustStrip() {
  return (
    <section className="relative z-10 -mt-10 md:-mt-14 pb-8 md:pb-12">
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={containerVariants}
          className="rounded-[32px] px-6 md:px-10 py-6 md:py-8 border"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(233,137,126,0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
          }}
        >
          {/* Section Header */}
          <motion.h2
            variants={itemVariants}
            className="font-serif font-semibold text-[24px] md:text-[32px] text-[#1E1E1E] text-center mb-8 md:mb-10"
          >
            Loved by Thousands of Moms
          </motion.h2>

          {/* Desktop: 5 columns with separators */}
          <div className="hidden lg:grid lg:grid-cols-5">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className={`flex flex-col items-center text-center group cursor-default px-4 py-4 hover:-translate-y-1 transition-all duration-300 ease-out ${
                  idx < features.length - 1 ? 'border-r border-[rgba(233,137,126,0.08)]' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4 group-hover:shadow-[0_8px_24px_rgba(233,137,126,0.15)] group-hover:scale-105 transition-all duration-300"
                  style={{ background: 'rgba(233,137,126,0.10)' }}
                >
                  <feature.icon className="w-7 h-7 text-[#E9897E]" strokeWidth={1.8} />
                </div>
                {/* Title */}
                <h3 className="text-[18px] font-bold text-[#1E1E1E] mb-1.5 leading-tight">
                  {feature.title}
                </h3>
                {/* Description */}
                <p className="text-[14px] leading-[1.7] text-[#6B6B6B] max-w-[220px]">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Tablet: 2-column grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:hidden gap-6">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex flex-col items-center text-center group cursor-default p-4 rounded-2xl hover:bg-[rgba(233,137,126,0.03)] hover:-translate-y-1 transition-all duration-300 ease-out"
              >
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-4 group-hover:shadow-[0_8px_24px_rgba(233,137,126,0.15)] group-hover:scale-105 transition-all duration-300"
                  style={{ background: 'rgba(233,137,126,0.10)' }}
                >
                  <feature.icon className="w-7 h-7 text-[#E9897E]" strokeWidth={1.8} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1E1E1E] mb-1.5 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-[1.7] text-[#6B6B6B] max-w-[220px]">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mobile: stacked vertical cards */}
          <div className="flex flex-col md:hidden gap-5">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex items-start gap-4 group cursor-default p-3 rounded-2xl hover:bg-[rgba(233,137,126,0.03)] transition-all duration-300"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(233,137,126,0.10)' }}
                >
                  <feature.icon className="w-6 h-6 text-[#E9897E]" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1E1E1E] mb-0.5 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-[#6B6B6B]">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
