'use client';

// Force dynamic rendering to avoid Firebase SSR issues
export const dynamic = 'force-dynamic';

import { toast } from 'sonner';
import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Sparkles, MessageSquare, ChevronRight, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const contactDetails = [
  {
    icon: MapPin,
    label: 'Boutique Location',
    content: 'Kakkara House, Nettoor PO\nErnakulam, Kerala – 682024\nIndia',
    iconBg: 'rgba(244,63,94,0.08)',
    iconColor: '#F43F5E',
  },
  {
    icon: Phone,
    label: 'Concierge Phone',
    content: '+91 96335 72427',
    link: 'tel:+919633572427',
    iconBg: 'rgba(99,102,241,0.08)',
    iconColor: '#6366F1',
  },
  {
    icon: Mail,
    label: 'Email Inquiries',
    content: 'hello@miksandchiks.com',
    link: 'mailto:miksandchiks@gmail.com',
    iconBg: 'rgba(16,185,129,0.08)',
    iconColor: '#10B981',
  },
  {
    icon: Clock,
    label: 'Boutique Hours',
    content: 'Monday – Saturday\n10:00 AM – 7:00 PM',
    iconBg: 'rgba(245,158,11,0.08)',
    iconColor: '#F59E0B',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Thank you! We have received your message.');
    setFormData({ name: '', email: '', phone: '', message: '' });
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--mc-bg-base)' }}>
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">

        {/* ── HEADER ── */}
        <div className="relative text-center mb-24 md:mb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-24 h-24 rounded-full blur-3xl" style={{ background: 'var(--mc-gold)', opacity: 0.06 }} />
          <p className="text-[13px] font-black uppercase tracking-[0.3em] mb-4 relative z-10" style={{ color: 'var(--mc-gold)' }}>Connect With Us</p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-8 tracking-tighter relative z-10" style={{ color: 'var(--mc-text-heading)' }}>
            Get in <span className="italic" style={{ color: 'var(--mc-gold)' }}>Touch</span>
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-sans font-medium" style={{ color: 'var(--mc-text-body)' }}>
            Have questions or need assistance? We&apos;d love to hear from you.
            Our dedicated team is here to support your motherhood journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-[450px_1fr] gap-16 md:gap-24 items-start">

          {/* ── LEFT: CONTACT CARDS ── */}
          <div className="space-y-6">

            {/* Details card */}
            <div
              className="rounded-[40px] p-10 relative overflow-hidden group"
              style={{ background: 'var(--mc-bg-card)', border: '1px solid var(--mc-border)' }}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <Zap className="w-32 h-32" style={{ color: 'var(--mc-gold)' }} />
              </div>

              <h2 className="text-2xl font-serif font-bold mb-10 pb-6" style={{ color: 'var(--mc-text-heading)', borderBottom: '1px solid var(--mc-border)' }}>
                Our <span className="italic" style={{ color: 'var(--mc-gold)' }}>Details</span>
              </h2>

              <div className="space-y-8">
                {contactDetails.map((detail, idx) => (
                  <div key={idx} className="flex gap-6 group/item">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transform group-hover/item:rotate-6 transition-transform"
                      style={{ background: detail.iconBg, color: detail.iconColor }}
                    >
                      <detail.icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--mc-text-muted)' }}>{detail.label}</p>
                      {detail.link ? (
                        <a
                          href={detail.link}
                          className="text-lg font-serif font-bold transition-colors truncate block"
                          style={{ color: 'var(--mc-text-heading)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--mc-gold)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--mc-text-heading)')}
                        >
                          {detail.content}
                        </a>
                      ) : (
                        <p className="text-lg font-serif font-bold leading-snug whitespace-pre-line" style={{ color: 'var(--mc-text-heading)' }}>
                          {detail.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick help */}
              <div className="mt-12 p-8 rounded-[32px]" style={{ background: 'var(--mc-bg-section)', border: '1px solid var(--mc-border)' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: 'var(--mc-bg-card)', color: 'var(--mc-gold)' }}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--mc-text-heading)' }}>Quick Help</h4>
                </div>
                <p className="text-[13px] leading-relaxed font-medium" style={{ color: 'var(--mc-text-body)' }}>
                  Response time usually within 2–4 business hours during boutique hours.
                </p>
              </div>
            </div>

            {/* Emergency widget */}
            <div
              className="p-8 rounded-[40px] shadow-2xl relative overflow-hidden group"
              style={{ background: 'var(--mc-charcoal)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10" style={{ background: 'var(--mc-gold)', opacity: 0.1 }} />
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 relative z-10" style={{ color: 'var(--mc-gold)' }}>Emergency?</p>
              <h3 className="font-serif font-bold text-xl mb-4 relative z-10" style={{ color: 'var(--mc-bg-base)' }}>Immediate Support</h3>
              <p className="text-sm leading-relaxed mb-6 relative z-10" style={{ color: 'var(--mc-text-muted)' }}>
                For urgent inquiries regarding ongoing orders, please contact our concierge phone directly.
              </p>
              <a
                href="tel:+919633572427"
                className="inline-flex items-center gap-2 font-black uppercase tracking-widest text-[11px] relative z-10 transition-colors"
                style={{ color: 'var(--mc-bg-base)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--mc-gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--mc-bg-base)')}
              >
                Call Now <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* ── RIGHT: CONTACT FORM ── */}
          <div
            className="rounded-[60px] p-10 md:p-16 relative"
            style={{ background: 'var(--mc-bg-card)', border: '1px solid var(--mc-border)' }}
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
              <Send className="w-40 h-40" style={{ color: 'var(--mc-gold)' }} />
            </div>

            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold tracking-tight mb-4" style={{ color: 'var(--mc-text-heading)' }}>
                Send a <span className="italic" style={{ color: 'var(--mc-gold)' }}>Message</span>
              </h2>
              <p className="text-sm md:text-base font-medium" style={{ color: 'var(--mc-text-body)' }}>
                We&apos;ll get back to you as soon as possible. Your details are safe with us.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Name */}
                <div className="space-y-2.5">
                  <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--mc-text-muted)' }}>
                    Your Full Name
                  </label>
                  <input
                    type="text" id="name" name="name"
                    value={formData.name} onChange={handleChange} required
                    className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none transition-all"
                    style={{
                      background: 'var(--mc-bg-section)',
                      border: '1px solid var(--mc-border)',
                      color: 'var(--mc-text-heading)',
                    }}
                    placeholder="Enter your name"
                  />
                </div>
                {/* Email */}
                <div className="space-y-2.5">
                  <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--mc-text-muted)' }}>
                    Email Address
                  </label>
                  <input
                    type="email" id="email" name="email"
                    value={formData.email} onChange={handleChange} required
                    className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none transition-all"
                    style={{
                      background: 'var(--mc-bg-section)',
                      border: '1px solid var(--mc-border)',
                      color: 'var(--mc-text-heading)',
                    }}
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2.5">
                <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--mc-text-muted)' }}>
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--mc-text-muted)' }}>+91</span>
                  <input
                    type="tel" id="phone" name="phone"
                    value={formData.phone} onChange={handleChange} required
                    className="w-full rounded-2xl pl-16 pr-6 py-4 text-sm font-bold focus:outline-none transition-all"
                    style={{
                      background: 'var(--mc-bg-section)',
                      border: '1px solid var(--mc-border)',
                      color: 'var(--mc-text-heading)',
                    }}
                    placeholder="98765 43210"
                  />
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2.5">
                <label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest ml-1 block" style={{ color: 'var(--mc-text-muted)' }}>
                  Message
                </label>
                <textarea
                  id="message" name="message"
                  value={formData.message} onChange={handleChange} required
                  rows={6}
                  className="w-full rounded-2xl px-6 py-5 text-sm font-bold focus:outline-none transition-all resize-none leading-relaxed"
                  style={{
                    background: 'var(--mc-bg-section)',
                    border: '1px solid var(--mc-border)',
                    color: 'var(--mc-text-heading)',
                  }}
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-4 px-10 py-6 rounded-[28px] transition-all duration-300 font-black uppercase tracking-[0.2em] text-xs shadow-xl transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--mc-charcoal)', color: 'var(--mc-bg-base)' }}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}