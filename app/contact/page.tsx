'use client';

import { toast } from 'sonner';

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          {/* HEADER */}
          <div className="text-center mb-24">
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-charcoal mb-8 tracking-tight">
              Get in <span className="text-blush italic">Touch</span>
            </h1>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto font-sans leading-relaxed">
              Have questions or need assistance? We'd love to hear from you. 
              Our dedicated team is here to support your motherhood journey.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 mb-24">
            {/* CONTACT INFO */}
            <div className="space-y-12">
              <div className="bg-white rounded-[40px] p-10 border border-[#F3E8E5] shadow-xl shadow-blush/5 group hover:shadow-2xl hover:shadow-blush/10 transition-all duration-500">
                <h2 className="text-2xl font-serif font-bold text-charcoal mb-10 pb-6 border-b border-[#F3E8E5]">
                  Our <span className="text-blush italic">Details</span>
                </h2>

                <div className="space-y-10">
                  <div className="flex items-start gap-6 group/item">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 transform group-hover/item:rotate-6 transition-transform">
                      <MapPin className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Boutique Location</p>
                      <p className="text-charcoal font-medium leading-relaxed font-sans text-lg">
                        Near Lulu Mall, Edappally<br />
                        Kochi, Kerala – 682024<br />
                        India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group/item">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 transform group-hover/item:rotate-6 transition-transform">
                      <Phone className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Concierge Phone</p>
                      <a
                        href="tel:+919746356346"
                        className="text-charcoal font-medium font-sans text-lg hover:text-blush transition-colors"
                      >
                        +91 97463 56346
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group/item">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 transform group-hover/item:rotate-6 transition-transform">
                      <Mail className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Email Inquiries</p>
                      <a
                        href="mailto:support@miksandchiks.com"
                        className="text-charcoal font-medium font-sans text-lg hover:text-blush transition-colors"
                      >
                        support@miksandchiks.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group/item">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 transform group-hover/item:rotate-6 transition-transform">
                      <Clock className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-2">Boutique Hours</p>
                      <p className="text-charcoal font-medium font-sans text-lg">
                        Monday – Saturday<br />
                        10:00 AM – 7:30 PM
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAP CARD */}
              <div className="bg-white rounded-[40px] overflow-hidden border border-[#F3E8E5] shadow-xl shadow-blush/5 group">
                <div className="p-6 bg-cream/30 border-b border-[#F3E8E5]">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Find Us on Map</p>
                </div>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.1920736842464!2d76.30729931478494!3d10.002823492833985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080d514abec6bf%3A0xbd582caa5844192!2sLuLu%20Mall!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all duration-1000"
                ></iframe>
              </div>
            </div>

            {/* CONTACT FORM */}
            <div className="bg-white rounded-[50px] p-12 border border-[#F3E8E5] shadow-2xl shadow-blush/5 h-fit relative">
              {/* Subtle decorative background */}
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                  <Send className="w-40 h-40 text-charcoal" />
              </div>
              
              <h2 className="text-3xl font-serif font-bold text-charcoal mb-10 tracking-tight">
                Send a <span className="text-blush italic">Message</span>
              </h2>

              <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label htmlFor="name" className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-6 py-4 rounded-2xl border border-[#F3E8E5] bg-cream/10 focus:outline-none focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans"
                        placeholder="Emilia Clarke"
                      />
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="email" className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-6 py-4 rounded-2xl border border-[#F3E8E5] bg-cream/10 focus:outline-none focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans"
                        placeholder="emilia@premium.com"
                      />
                    </div>
                </div>

                <div className="space-y-3">
                  <label htmlFor="phone" className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-6 py-4 rounded-2xl border border-[#F3E8E5] bg-cream/10 focus:outline-none focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="message" className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-6 py-5 rounded-2xl border border-[#F3E8E5] bg-cream/10 focus:outline-none focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all resize-none font-sans leading-relaxed"
                    placeholder="Tell us how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-4 bg-blush text-white px-10 py-6 rounded-[32px] hover:bg-[#f48c82] transition-all duration-300 font-bold text-lg shadow-2xl shadow-blush/20 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  ) : (
                    <>
                      <Send className="h-6 w-6" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
