import { Heart, Users, Shield, Star, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AboutPage() {
  const values = [
    {
      icon: Heart,
      title: 'Made with Love',
      description: 'Every piece is carefully selected with love and care for you and your family.',
    },
    {
      icon: Shield,
      title: 'Quality First',
      description: 'We ensure the highest quality materials that are safe and comfortable.',
    },
    {
      icon: Users,
      title: 'Customer Focused',
      description: 'Your satisfaction is our priority. We are here to help you every step of the way.',
    },
    {
      icon: Star,
      title: 'Trusted Brand',
      description: 'Loved by thousands of families across Kerala for our quality and service.',
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
            <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed font-sans">
              Your trusted destination for comfortable, stylish, and premium
              maternity and kids wear in Kochi.
            </p>
          </div>

          {/* STORY SECTION */}
          <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">

            {/* IMAGE FIXED */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-cream rounded-[48px] -rotate-3 transition-transform group-hover:rotate-0 duration-700" />
              <div className="relative overflow-hidden rounded-[40px] shadow-2xl shadow-blush/10 border border-[#F3E8E5]">
                <img
                  src="/pregnant-lady.jpg"
                  alt="Our Story"
                  className="w-full h-[500px] object-cover object-top transform hover:scale-105 transition-transform duration-1000"
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
                  Founded with a passion for providing the best for mothers and children,
                  Miks & Chiks has become a trusted name in Kochi for quality maternity
                  and kids wear.
                </p>

                <p>
                  We understand the unique needs of expecting mothers and growing children.
                  That’s why we carefully curate our collection to ensure every piece combines
                  unmatched comfort, timeless style, and accessibility.
                </p>

                <p>
                  Located near Lulu Mall in Edappally, we welcome you to explore our collection
                  and experience personalized assistance from our dedicated team.
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

          {/* CTA */}
          <div className="relative overflow-hidden bg-charcoal rounded-[60px] p-12 sm:p-20 text-center shadow-2xl shadow-charcoal/20">
            {/* Decorative blush glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blush opacity-10 blur-[120px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-white mb-6">
                  Experience <span className="text-blush italic">Premium</span> Comfort
                </h2>

                <p className="text-neutral-400 text-lg mb-12 font-sans leading-relaxed">
                  Visit our Edappally boutique today and let our experts help you find the 
                  perfect outfit for your motherhood journey and beyond.
                </p>

                <div className="flex flex-wrap justify-center gap-6">
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-3 bg-blush text-white px-10 py-5 rounded-2xl hover:bg-[#f48c82] transition-all duration-300 font-bold shadow-xl shadow-blush/20 transform hover:-translate-y-1"
                  >
                    <span>Get Directions</span>
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </a>

                  <a
                    href="/products"
                    className="inline-flex items-center gap-3 bg-white/10 text-white px-10 py-5 rounded-2xl hover:bg-white hover:text-charcoal transition-all duration-300 font-bold border border-white/20 transform hover:-translate-y-1"
                  >
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