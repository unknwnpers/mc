"use client";

import { ArrowRight, Wind, Sparkles, Shield, Heart, Star } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1];

const features = [
  {
    icon: Wind,
    title: "Breathable Premium Fabrics",
    desc: "GOTS-certified organic cotton and skin-friendly materials that let your little one breathe easy all day.",
  },
  {
    icon: Heart,
    title: "Designed for Maximum Comfort",
    desc: "Flatlock seams, tagless labels, and ergonomic cuts — every detail is shaped around a mother's needs.",
  },
  {
    icon: Sparkles,
    title: "Thoughtful Functional Details",
    desc: "Hidden nursing access, adjustable waists, and grow-with-me sizing that adapts to every stage.",
  },
  {
    icon: Shield,
    title: "Safe & Gentle for Everyday Use",
    desc: "AZO-free dyes, hypoallergenic materials, and international safety certifications for total peace of mind.",
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

interface WhyChooseUsProps {
  content?: {
    imageUrl?: string;
    label?: string;
    headline?: string;
    headlineHighlight?: string;
    description?: string;
    buttonText?: string;
    buttonLink?: string;
  };
}

export default function WhyChooseUs({ content = {} }: WhyChooseUsProps) {
  return (
    <section className="py-10 md:py-16 lg:py-24 relative w-full max-w-full overflow-hidden" style={{ background: '#FFF9F6' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E4C765]/[0.02] rounded-full blur-[100px] pointer-events-none hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#FDF5F1]/80 rounded-full blur-[80px] pointer-events-none hidden md:block" />

      <div className="max-w-[1320px] mx-auto px-4 md:px-6 relative">
        <div className="flex flex-col lg:flex-row gap-8 md:gap-12 items-center">

          {/* ═══ LEFT: Storytelling Image ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease }}
            className="relative order-2 lg:order-1 w-full lg:flex-1"
          >
            <div
              className="relative rounded-[28px] md:rounded-[40px] overflow-hidden min-h-[380px] md:min-h-[680px] lg:min-h-[760px]"
              style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.06)' }}
            >
              <img
                src={content.imageUrl || "https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=800"}
                alt="Happy motherhood moment — premium maternity fashion"
                className="w-full h-full object-cover absolute inset-0"
                loading="lazy"
                decoding="async"
              />
              {/* Soft warm glow overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* ── Floating Stat Card (bottom-left) ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5, ease }}
              className="absolute -bottom-5 -left-3 md:left-6 z-20 hidden md:block"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl p-5 border border-white/15"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-center gap-3 mb-2.5">
                  {/* Avatar stack */}
                  <div className="flex -space-x-2">
                    {['bg-[#F1DE9D]', 'bg-[#E4C765]', 'bg-[#C9A844]'].map((bg, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-[2.5px] border-white ${bg} flex items-center justify-center`}>
                        <span className="text-white text-[10px] font-bold">{['S', 'M', 'R'][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span className="text-[14px] font-bold text-white">4.8</span>
                    </div>
                    <p className="text-[12px] font-medium text-white/80 leading-tight">Rated by</p>
                  </div>
                </div>
                <p className="text-[14px] font-bold text-white leading-tight">
                  Thousands of Moms
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ═══ RIGHT: Feature Content ═══ */}
          <div className="order-1 lg:order-2 flex flex-col justify-center w-full lg:flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease }}
              className="max-w-[560px]"
            >
              {/* Label */}
              <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#E4C765] mb-4">
                {content.label || "Why Moms Love Us"}
              </p>

              {/* Heading */}
              <h2 className="font-serif font-bold text-[30px] md:text-[52px] leading-[1.08] text-[#1E1E1E] tracking-tight">
                {content.headline || "Crafted With Care"}<br />
                For Every <span className="italic text-[#E4C765]">{content.headlineHighlight || "Little Moment"}</span>
              </h2>

              {/* Description */}
              <p className="text-[15px] md:text-[17px] leading-7 md:leading-8 text-[#5C5C5C] mt-6 md:mt-8 max-w-[520px]">
                {content.description || "We believe every mother deserves products that are as thoughtful as her love. Each piece is designed from the heart — tested by moms, loved by babies."}
              </p>
            </motion.div>

            {/* Feature List */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={containerVariants}
              className="mt-10 md:mt-12 space-y-6 md:space-y-8"
            >
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  className="flex items-start gap-5 group cursor-default"
                >
                  {/* Icon */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(228,199,101,0.15)] transition-all duration-300"
                    style={{ background: 'rgba(228,199,101,0.10)' }}
                  >
                    <feature.icon className="w-6 h-6 text-[#E4C765]" strokeWidth={1.8} />
                  </div>
                  {/* Text */}
                  <div>
                    <h3 className="text-[18px] md:text-[20px] font-bold text-[#1E1E1E] mb-1 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-[14px] md:text-[15px] leading-[1.6] md:leading-[1.8] text-[#6B6B6B]">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3, ease }}
              className="mt-10 md:mt-12"
            >
              <Link
                href={content.buttonLink || "/about"}
                className="group inline-flex items-center gap-2.5 h-[54px] px-8 rounded-xl bg-[#E4C765] text-white text-[15px] font-semibold hover:bg-[#C9A844] active:scale-[0.97] shadow-[0_8px_24px_rgba(228,199,101,0.25)] hover:shadow-[0_14px_36px_rgba(228,199,101,0.30)] hover:-translate-y-0.5 transition-all duration-300"
              >
                {content.buttonText || "Explore Our Story"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
