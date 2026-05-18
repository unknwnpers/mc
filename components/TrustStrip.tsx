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
    desc: "Easy Replacement, COD available, and secure checkout every time.",
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
    <section className="relative w-full max-w-full overflow-hidden z-10 -mt-10 md:-mt-14 pb-8 md:pb-12">
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
            borderColor: 'rgba(200,178,115,0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
          }}
        >
          {/* Section Header */}
          <motion.h2
            variants={itemVariants}
            className="font-serif font-semibold text-[24px] md:text-[32px] text-[#3B312C] text-center mb-8 md:mb-10"
          >
            Loved by Thousands of Moms
          </motion.h2>

          {/* Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mt-6 md:mt-10">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="flex flex-col items-center text-center group cursor-default p-4 md:p-6 rounded-2xl hover:bg-[rgba(200,178,115,0.03)] hover:-translate-y-1 transition-all duration-200 md:duration-300 ease-out"
              >
                <div
                  className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:shadow-[0_8px_24px_rgba(200,178,115,0.15)] group-hover:scale-105 transition-all duration-200 md:duration-300"
                  style={{ background: '#FFF9EC' }}
                >
                  <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-[#C8B273]" strokeWidth={1.8} />
                </div>
                <h3 className="text-sm md:text-base font-bold text-[#3B312C] mb-1.5 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[13px] md:text-[14px] leading-[1.6] md:leading-[1.7] text-[#6E625B] max-w-[220px]">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
