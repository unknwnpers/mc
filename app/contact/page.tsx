'use client';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', phone: '', message: '' });
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-rose-50/20 to-amber-50/20">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-neutral-800 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and
              we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <div className="space-y-8">
              <div className="backdrop-blur-sm bg-white/60 rounded-2xl p-8 border border-neutral-200/50">
                <h2 className="text-2xl font-bold text-neutral-800 mb-6">
                  Contact Information
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800 mb-1">
                        Visit Us
                      </h3>
                      <p className="text-neutral-600">
                        Near Lulu Mall, Edappally<br />
                        Kochi, Kerala – 682024<br />
                        India
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Phone className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800 mb-1">
                        Call Us
                      </h3>
                      <a
                        href="tel:+919XXXXXXXXX"
                        className="text-neutral-600 hover:text-rose-400 transition-colors"
                      >
                        +91 9XXXXXXXXX
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800 mb-1">
                        Email Us
                      </h3>
                      <a
                        href="mailto:support@miksandchiks.com"
                        className="text-neutral-600 hover:text-rose-400 transition-colors"
                      >
                        support@miksandchiks.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-800 mb-1">
                        Working Hours
                      </h3>
                      <p className="text-neutral-600">
                        Monday – Saturday<br />
                        10:00 AM – 7:00 PM
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-sm bg-white/60 rounded-2xl overflow-hidden border border-neutral-200/50">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.1920736842464!2d76.30729931478494!3d10.002823492833985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080d514abec6bf%3A0xbd582caa5844192!2sLuLu%20Mall!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>

            <div className="backdrop-blur-sm bg-white/60 rounded-2xl p-8 border border-neutral-200/50">
              <h2 className="text-2xl font-bold text-neutral-800 mb-6">
                Send us a Message
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-neutral-700 mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all resize-none"
                    placeholder="Enter your message"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-rose-400 text-white px-8 py-4 rounded-xl hover:bg-rose-500 transition-colors duration-200 font-medium shadow-lg shadow-rose-200/50"
                >
                  <Send className="h-5 w-5" />
                  <span>Send Message</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
