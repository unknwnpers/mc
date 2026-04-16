import { Heart, MapPin, Star, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Soft, Breathable Fabrics',
      description: 'Carefully selected materials suitable for Kerala weather and sensitive skin.',
    },
    {
      icon: Star,
      title: 'Curated Essentials',
      description: 'Thoughtfully chosen products for mothers and babies that prioritize comfort.',
    },
    {
      icon: Heart,
      title: 'Everyday Comfort',
      description: 'Simple, comfortable designs made for daily use without compromising on style.',
    },
    {
      icon: MapPin,
      title: 'Trusted Local Store',
      description: 'Personalized support from our Kochi-based team who understand your needs.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">

          {/* HEADER */}
          <div className="text-center mb-24">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-charcoal mb-8 tracking-tight">
              About <span className="text-blush italic">Miks & Chiks</span>
            </h1>
            <p className="text-xl text-neutral-500 max-w-3xl mx-auto leading-relaxed font-sans">
              At Miks & Chiks, we believe that comfort is not a luxury — it's essential, especially for mothers and children.
            </p>
          </div>

          {/* STORY SECTION */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">

            {/* IMAGE FIXED */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-cream rounded-[48px] -rotate-3 transition-transform group-hover:rotate-0 duration-700" />
              <div className="relative overflow-hidden rounded-[40px] shadow-2xl shadow-blush/10 border border-[#F3E8E5]">
                <Image
                  src="/pregnant-lady.jpg"
                  alt="Our Story"
                  width={600}
                  height={500}
                  className="w-full h-[500px] object-cover object-top transform hover:scale-105 transition-transform duration-1000"
                  priority={false}
                  loading="lazy"
                />
              </div>
            </div>

            {/* TEXT FIXED */}
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight">
                Our <span className="text-blush italic">Story</span>
              </h2>
            
              <div className="space-y-6 text-neutral-600 leading-relaxed text-lg font-sans">
                <p>
                  Miks & Chiks was built with a simple goal — to make it easier for mothers to find clothing that truly feels good.
                </p>
            
                <p>
                  We understand that during pregnancy and early motherhood, comfort matters more than ever. At the same time, you shouldn't have to compromise on style or quality. That's why our collection focuses on fabrics that are gentle on the skin, easy to wear, and suitable for daily use in our climate.
                </p>
            
                <p>
                  Based in Kochi, we specialize in carefully selected maternity and kids wear designed to feel soft, breathable, and effortless for everyday life. From newborn essentials to maternity comfort wear, every product we offer is chosen with care, keeping both practicality and style in mind.
                </p>
            
                <p className="font-medium text-charcoal">
                  We are not just a store — we are a space where mothers can find reliable essentials without confusion or compromise.
                </p>
              </div>
                          
              <div className="pt-4">
                  <div className="h-1 w-20 bg-blush rounded-full opacity-50" />
              </div>
            </div>

          </div>

          {/* VALUES */}
          <div className="mb-32">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal text-center mb-16 tracking-tight">
              Why <span className="text-blush italic">Choose Us</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="bg-white rounded-[40px] p-10 border border-[#F3E8E5] shadow-xl shadow-blush/5 hover:shadow-2xl hover:shadow-blush/10 transition-all duration-500 hover:-translate-y-2 group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-cream text-blush mb-8 border border-blush/10 transform group-hover:rotate-6 transition-transform duration-500">
                    <value.icon className="h-8 w-8" />
                  </div>

                  <h3 className="text-xl font-serif font-bold text-charcoal mb-4">
                    {value.title}
                  </h3>

                  <p className="text-neutral-500 text-sm leading-relaxed font-sans">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA - VISIT US */}
          <div className="relative overflow-hidden bg-charcoal rounded-[60px] p-12 sm:p-20 text-center shadow-2xl shadow-charcoal/20">
            {/* Decorative blush glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blush opacity-10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">
                  Visit <span className="text-blush italic">Us</span>
                </h2>

                <p className="text-neutral-400 text-lg mb-8 font-sans leading-relaxed">
                  We are located near Lulu Mall, Edappally, Kochi.
                </p>

                <p className="text-neutral-300 text-base mb-12 font-sans leading-relaxed max-w-2xl mx-auto">
                  Whether you're preparing for your baby or looking for comfortable daily wear, we're here to help you choose what feels right.
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-3 bg-blush text-white px-10 py-5 rounded-2xl hover:bg-[#f48c82] transition-all duration-300 font-bold shadow-xl shadow-blush/20 transform hover:-translate-y-1"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Get Directions</span>
                  </a>

                  <a
                    href="/products"
                    className="inline-flex items-center gap-3 bg-white/10 text-white px-10 py-5 rounded-2xl hover:bg-white hover:text-charcoal transition-all duration-300 font-bold border border-white/20 transform hover:-translate-y-1"
                  >
                    <Heart className="w-5 h-5" />
                    <span>Shop Online</span>
                  </a>
                </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}