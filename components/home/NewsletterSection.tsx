"use client";

import { useState } from 'react';
import { ArrowRight, Mail, Gift, Sparkles, Bell, BookOpen, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ease = [0.22, 1, 0.36, 1];

const benefits = [
  { icon: Gift, text: "Exclusive Discounts" },
  { icon: Sparkles, text: "Early Collection Access" },
  { icon: BookOpen, text: "Parenting Tips" },
  { icon: Bell, text: "Limited Launch Alerts" },
];

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { toast.error("Please enter a valid email"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSubscribed(true);
    setLoading(false);
    toast.success("Welcome to the Miks & Chiks family! 💕");
    setEmail('');
  };

  return (
    <section className="section-newsletter py-10 md:py-16 lg:py-24 w-full max-w-full overflow-hidden" style={{ background: '#FDF7F3' }}>
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
          className="relative overflow-hidden rounded-[32px] md:rounded-[40px] px-6 md:px-16 py-12 md:py-20 border"
          style={{
            background: 'linear-gradient(135deg, #F8F4EE 0%, #FDF1EA 100%)',
            borderColor: 'rgba(200, 178, 115,0.10)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.05)',
          }}
        >
          {/* ── Decorative elements ── */}
          <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-[#C8B273]/[0.04] rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[280px] h-[280px] bg-[#C8B273]/[0.03] rounded-full blur-[70px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />
          {/* Faint botanical circles */}
          <div className="absolute top-10 left-10 w-24 h-24 rounded-full border border-[#C8B273]/[0.04] pointer-events-none hidden md:block" />
          <div className="absolute bottom-14 right-14 w-16 h-16 rounded-full border border-[#C8B273]/[0.05] pointer-events-none hidden md:block" />
          <div className="absolute top-1/2 right-20 w-10 h-10 rounded-full bg-[#C8B273]/[0.03] pointer-events-none hidden lg:block" />

          {/* ── Desktop floating cards ── */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-16 left-10 z-10 hidden lg:block"
          >
            <div
              className="rounded-2xl px-4 py-3 border border-white/30"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[12px] font-bold text-[#C8B273]">✨ Exclusive Launch Access</p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 right-12 z-10 hidden lg:block"
          >
            <div
              className="rounded-2xl px-4 py-3 border border-white/30"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[12px] font-bold text-[#C8B273]">💌 Weekly Mom Tips</p>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-24 right-16 z-10 hidden lg:block"
          >
            <div
              className="rounded-2xl px-4 py-3 border border-white/30"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}
            >
              <p className="text-[12px] font-bold text-[#C8B273]">🎁 Members Only Offers</p>
            </div>
          </motion.div>

          {/* ═══ CONTENT ═══ */}
          <div className="relative z-20 text-center max-w-[760px] mx-auto">
            {/* Label */}
            <div className="inline-flex items-center gap-2 mb-5">
              <Mail className="w-4 h-4 text-[#C8B273]" />
              <span className="text-[12px] font-bold tracking-[0.12em] uppercase text-[#C8B273]">
                Join Our Community
              </span>
            </div>

            {/* Heading */}
            <h2 className="font-serif font-bold text-[32px] md:text-[46px] lg:text-[56px] leading-[1.08] text-[#3B312C] tracking-tight max-w-[680px] mx-auto">
              Get Exclusive Offers,{' '}
              <span className="italic text-[#C8B273]">Mom Tips</span>
              {' '}& Early Access
            </h2>

            {/* Description */}
            <p className="text-[15px] md:text-[18px] leading-[1.9] text-[#6E625B] mt-6 md:mt-8 max-w-[620px] mx-auto">
              Be the first to discover new collections, unlock members-only discounts, 
              and get thoughtful parenting tips delivered to your inbox.
            </p>

            {/* Benefits Row */}
            <div className="flex flex-wrap justify-center gap-5 md:gap-6 mt-8">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(200, 178, 115,0.10)' }}
                  >
                    <b.icon className="w-3.5 h-3.5 text-[#C8B273]" />
                  </div>
                  <span className="text-[14px] md:text-[15px] font-semibold text-[#6E625B]">
                    {b.text}
                  </span>
                </div>
              ))}
            </div>

            {/* ── EMAIL FORM ── */}
            <div className="mt-10 md:mt-12 max-w-[720px] mx-auto">
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-3 py-8"
                >
                  <div className="w-14 h-14 rounded-full bg-[#5FA36A]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-[#5FA36A]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[18px] font-bold text-[#3B312C]">You&apos;re in!</p>
                    <p className="text-[15px] text-[#6E625B]">Welcome to the Miks & Chiks family.</p>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Desktop: horizontal */}
                  <div className="hidden sm:flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="flex-1 h-12 md:h-14 rounded-full px-7 text-[16px] font-medium text-[#3B312C] placeholder:text-[#9A9A9A] border focus:outline-none focus:border-[#C8B273]/30 focus:shadow-[0_0_0_4px_rgba(200, 178, 115,0.08)] transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        borderColor: 'rgba(200, 178, 115,0.12)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="group h-12 md:h-14 px-8 rounded-full bg-[#C8B273] text-white text-[15px] font-semibold inline-flex items-center gap-2.5 hover:bg-[#B89B5E] active:scale-[0.97] shadow-[0_8px_24px_rgba(200, 178, 115,0.25)] hover:shadow-[0_14px_36px_rgba(200, 178, 115,0.30)] hover:-translate-y-0.5 transition-all duration-300 shrink-0"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Subscribe Now
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                  {/* Mobile: stacked */}
                  <div className="flex flex-col sm:hidden gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full h-12 rounded-full px-6 text-[16px] font-medium text-[#3B312C] placeholder:text-[#9A9A9A] border focus:outline-none focus:border-[#C8B273]/30 focus:shadow-[0_0_0_4px_rgba(200, 178, 115,0.08)] transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        borderColor: 'rgba(200, 178, 115,0.12)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-full bg-[#C8B273] text-white text-[15px] font-semibold flex items-center justify-center gap-2.5 hover:bg-[#B89B5E] active:scale-[0.97] shadow-[0_8px_24px_rgba(200, 178, 115,0.25)] transition-all"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Subscribe Now
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Social proof */}
            {!subscribed && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center justify-center gap-3 mt-6"
              >
                <div className="flex -space-x-2">
                  {['#F1DE9D', '#C8B273', '#B89B5E'].map((bg, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center" style={{ background: bg }}>
                      <span className="text-white text-[9px] font-bold">{['P', 'A', 'D'][i]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[14px] font-medium text-[#7A7A7A]">
                  Join <span className="font-bold text-[#6E625B]">12,000+</span> moms already subscribed
                </p>
              </motion.div>
            )}

            <p className="text-[12px] text-[#9A9A9A] mt-4">
              No spam, ever. Unsubscribe anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
