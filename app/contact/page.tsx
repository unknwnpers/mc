'use client';

// Force dynamic rendering to avoid Firebase SSR issues
export const dynamic = 'force-dynamic';

import { toast } from 'sonner';
import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Sparkles, MessageSquare, ChevronRight, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';

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
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Thank you! We have received your message.');
    setFormData({ name: '', email: '', phone: '', message: '' });
    setIsSubmitting(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactDetails = [
    {
      icon: MapPin,
      label: 'Boutique Location',
      content: 'Kakkara House, Nettoor PO\nErnakulam, Kerala – 682024\nIndia',
      color: 'bg-rose-50 text-rose-500'
    },
    {
      icon: Phone,
      label: 'Concierge Phone',
      content: '+91 96335 72427',
      link: 'tel:+919633572427',
      color: 'bg-indigo-50 text-indigo-500'
    },
    {
      icon: Mail,
      label: 'Email Inquiries',
      content: 'hello@miksandchiks.com',
      link: 'mailto:miksandchiks@gmail.com',
      color: 'bg-emerald-50 text-emerald-500'
    },
    {
      icon: Clock,
      label: 'Boutique Hours',
      content: 'Monday – Saturday\n10:00 AM – 7:00 PM',
      color: 'bg-amber-50 text-amber-500'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F7] selection:bg-[#C8B273]/20">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">

        {/* HEADER SECTION */}
        <div className="relative text-center mb-24 md:mb-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-24 h-24 bg-[#C8B273]/5 rounded-full blur-3xl" />
          <p className="text-[13px] font-black text-[#C8B273] uppercase tracking-[0.3em] mb-4 relative z-10">Connect With Us</p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#3B312C] mb-8 tracking-tighter relative z-10">
            Get in <span className="text-[#C8B273] italic">Touch</span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-500 max-w-3xl mx-auto leading-relaxed font-sans font-medium">
            Have questions or need assistance? We'd love to hear from you.
            Our dedicated team is here to support your motherhood journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-[450px_1fr] gap-16 md:gap-24 items-start">

          {/* LEFT COLUMN: CONTACT CARDS */}
          <div className="space-y-6">
            <div className="bg-white rounded-[40px] p-10 border border-[#F3E8E5] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Zap className="w-32 h-32 text-[#3B312C]" />
              </div>

              <h2 className="text-2xl font-serif font-bold text-[#3B312C] mb-10 border-b border-neutral-50 pb-6">
                Our <span className="text-[#C8B273] italic">Details</span>
              </h2>

              <div className="space-y-8">
                {contactDetails.map((detail, idx) => (
                  <div key={idx} className="flex gap-6 group/item">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-current border-opacity-5 transform group-hover/item:rotate-6 transition-transform shadow-inner",
                      detail.color
                    )}>
                      <detail.icon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{detail.label}</p>
                      {detail.link ? (
                        <a href={detail.link} className="text-lg font-serif font-bold text-[#3B312C] hover:text-[#C8B273] transition-colors truncate block">
                          {detail.content}
                        </a>
                      ) : (
                        <p className="text-lg font-serif font-bold text-[#3B312C] leading-snug whitespace-pre-line">
                          {detail.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-8 bg-neutral-50 rounded-[32px] border border-neutral-100/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#C8B273] shadow-sm">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[#3B312C] text-sm">Quick Help</h4>
                </div>
                <p className="text-[13px] text-neutral-500 leading-relaxed font-medium">
                  Response time usually within 2-4 business hours during boutique hours.
                </p>
              </div>
            </div>

            {/* Support Widget */}
            <div className="bg-[#3B312C] p-8 rounded-[40px] shadow-2xl shadow-[#3B312C]/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8B273]/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <p className="text-[10px] font-black text-[#C8B273] uppercase tracking-widest mb-2 relative z-10">Emergency?</p>
              <h3 className="text-white font-serif font-bold text-xl mb-4 relative z-10">Immediate Support</h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6 relative z-10">
                For urgent inquiries regarding ongoing orders, please contact our concierge phone directly.
              </p>
              <a href="tel:+919633572427" className="inline-flex items-center gap-2 text-white font-black uppercase tracking-widest text-[11px] group-hover:text-[#C8B273] transition-colors relative z-10">
                Call Now <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* RIGHT COLUMN: CONTACT FORM */}
          <div className="bg-white rounded-[60px] p-10 md:p-16 border border-[#F3E8E5] shadow-sm relative">
            <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
              <Send className="w-40 h-40 text-[#3B312C]" />
            </div>

            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3B312C] tracking-tight mb-4">
                Send a <span className="text-[#C8B273] italic">Message</span>
              </h2>
              <p className="text-neutral-500 text-sm md:text-base font-medium">
                We'll get back to you as soon as possible. Your details are safe with us.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2.5">
                  <label htmlFor="name" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-[#3B312C] focus:ring-2 focus:ring-[#C8B273]/20 transition-all placeholder:text-neutral-300"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2.5">
                  <label htmlFor="email" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-4 text-sm font-bold text-[#3B312C] focus:ring-2 focus:ring-[#C8B273]/20 transition-all placeholder:text-neutral-300"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="phone" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-300">+91</span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full bg-neutral-50 border-none rounded-2xl pl-16 pr-6 py-4 text-sm font-bold text-[#3B312C] focus:ring-2 focus:ring-[#C8B273]/20 transition-all placeholder:text-neutral-300"
                    placeholder="98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="message" className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full bg-neutral-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-[#3B312C] focus:ring-2 focus:ring-[#C8B273]/20 transition-all resize-none leading-relaxed placeholder:text-neutral-300"
                  placeholder="How can we help you?"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-4 bg-[#3B312C] text-white px-10 py-6 rounded-[28px] hover:bg-black transition-all duration-300 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-[#3B312C]/20 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
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