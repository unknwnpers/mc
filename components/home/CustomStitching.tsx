"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Ruler, Heart, Sparkles, Scissors, ArrowRight, MessageCircle } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1];

const features = [
  {
    icon: Ruler,
    title: "Personalized Measurements",
    desc: "Each piece is cut and stitched to your exact measurements for a perfect pregnancy fit.",
  },
  {
    icon: Heart,
    title: "Pregnancy-Friendly Comfort",
    desc: "Soft, breathable fabrics with relaxed cuts designed to grow with your changing body.",
  },
  {
    icon: Sparkles,
    title: "Kerala-Inspired Styles",
    desc: "Elegant traditional silhouettes reimagined for modern motherhood with premium finishing.",
  },
  {
    icon: Scissors,
    title: "Made-to-Order Stitching",
    desc: "Every order is hand-crafted on demand — no mass production, just boutique quality.",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export default function CustomStitching() {
  return (
    <section
      className="py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden"
      style={{ background: 'var(--mc-bg-section)' }}
    >
      {/* Subtle background glows — matching existing pattern */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C8B273]/[0.025] rounded-full blur-[120px] pointer-events-none hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#F8F4EE]/80 rounded-full blur-[100px] pointer-events-none hidden md:block" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">

        {/* ── SECTION HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease }}
          className="text-center max-w-[680px] mx-auto mb-12 md:mb-16"
        >
          {/* Label */}
          <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#C8B273] mb-4">
            Bespoke Maternity Service
          </p>

          {/* Heading */}
          <h2 className="font-serif font-bold text-[30px] md:text-[52px] leading-[1.1] text-[#3B312C] tracking-tight mb-4">
            Tailored for{" "}
            <span className="italic text-[#C8B273]">Motherhood</span>
          </h2>

          {/* Subheading */}
          <p className="font-serif italic text-[16px] md:text-[20px] text-[#6E625B] mb-5">
            Custom-Stitched Maternity Wear
          </p>

          {/* Description */}
          <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#6E625B] max-w-[560px] mx-auto">
            Personalized maternity wear designed around your changing body — elegant fitting, pregnancy-friendly comfort, and soft premium fabrics crafted with care in Kerala.
          </p>
        </motion.div>

        {/* ── FEATURE CARDS GRID ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-12 md:mb-16"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              className="group flex flex-col items-center text-center p-6 md:p-8 rounded-[28px] border border-[rgba(200,178,115,0.10)] hover:border-[rgba(200,178,115,0.22)] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(200,178,115,0.08)] transition-all duration-300 ease-out cursor-default"
              style={{ background: 'rgba(255,255,255,0.80)' }}
            >
              {/* Icon */}
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5 group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(200,178,115,0.18)] transition-all duration-300"
                style={{ background: '#FFF9EC' }}
              >
                <feature.icon className="w-7 h-7 text-[#C8B273]" strokeWidth={1.8} />
              </div>

              {/* Title */}
              <h3 className="text-[16px] md:text-[18px] font-bold text-[#3B312C] mb-2 leading-tight">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-[13px] md:text-[14px] leading-[1.7] text-[#6E625B] max-w-[220px]">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── CTA ROW ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.2, ease }}
          className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4"
        >
          {/* Primary CTA */}
          <Link
            href="/contact?type=custom-order"
            className="group inline-flex items-center justify-center gap-2.5 bg-[#C8B273] text-white font-semibold text-[15px] h-[52px] md:h-[56px] w-full sm:w-auto px-10 rounded-xl hover:bg-[#B89B5E] active:scale-[0.97] shadow-[0_8px_24px_rgba(200,178,115,0.25)] hover:shadow-[0_14px_36px_rgba(200,178,115,0.30)] hover:-translate-y-0.5 transition-all duration-300 ease-out"
          >
            <Scissors className="w-4 h-4" />
            Book Custom Order
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>

          {/* Secondary CTA — WhatsApp */}
          <Link
            href="https://wa.me/919633374657?text=Hi%2C%20I%27d%20like%20to%20enquire%20about%20custom%20stitching"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 bg-transparent text-[#3B312C] font-semibold text-[15px] h-[52px] md:h-[56px] w-full sm:w-auto px-10 rounded-xl border border-[rgba(200,178,115,0.30)] hover:border-[#C8B273] hover:bg-[rgba(200,178,115,0.07)] active:scale-[0.97] transition-all duration-300 ease-out"
          >
            <MessageCircle className="w-4 h-4 text-[#C8B273]" />
            WhatsApp Consultation
          </Link>
        </motion.div>

        {/* ── SUBTLE BOTTOM NOTE ── */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-[13px] text-[#B8A89A] mt-6"
        >
          Send your measurements via WhatsApp · Orders dispatched within 10 days
        </motion.p>

      </div>
    </section>
  );
}
