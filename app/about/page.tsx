import { Heart, Users, Shield, Star } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-rose-50/20 to-amber-50/20">
      <Navbar />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-800 mb-6">
              About Miks & Chiks
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Your trusted destination for comfortable, stylish, and affordable
              maternity and kids wear in Kochi.
            </p>
          </div>

          {/* STORY SECTION */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-20">

            {/* IMAGE FIXED */}
            <div className="relative max-w-md mx-auto lg:mx-0">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-200/30 to-amber-200/30 rounded-3xl blur-3xl" />

              <div className="relative overflow-hidden rounded-3xl [clip-path:inset(0_round_1.5rem)]">
                <img
                  src="/pregnant-lady.jpg"
                  alt="Our Story"
                  className="w-full h-[420px] object-cover object-top"
                />
              </div>
            </div>

            {/* TEXT FIXED */}
            <div className="space-y-5 max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-800">
                Our Story
              </h2>

              <p className="text-neutral-600 leading-relaxed text-base">
                Founded with a passion for providing the best for mothers and children,
                Miks & Chiks has become a trusted name in Kochi for quality maternity
                and kids wear.
              </p>

              <p className="text-neutral-600 leading-relaxed text-base">
                We understand the unique needs of expecting mothers and growing children.
                That’s why we carefully curate our collection to ensure every piece combines
                comfort, style, and affordability.
              </p>

              <p className="text-neutral-600 leading-relaxed text-base">
                Located near Lulu Mall in Edappally, we welcome you to explore our collection
                and experience personalized assistance from our team.
              </p>
            </div>

          </div>

          {/* VALUES */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-800 text-center mb-12">
              Why Choose Us
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="backdrop-blur-sm bg-white/60 rounded-2xl p-6 border border-neutral-200/50 hover:shadow-xl hover:shadow-rose-100/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 text-rose-400 mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                    {value.title}
                  </h3>

                  <p className="text-neutral-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="backdrop-blur-sm bg-gradient-to-br from-rose-100/50 to-amber-100/50 rounded-3xl p-10 sm:p-12 border border-rose-200/50 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-800 mb-4">
              Visit Our Store
            </h2>

            <p className="text-neutral-600 text-base mb-8 max-w-xl mx-auto">
              Come experience our collection in person. Our team is ready to help
              you find the perfect outfit for you and your little ones.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/contact"
                className="inline-flex items-center space-x-2 bg-rose-400 text-white px-8 py-3 rounded-xl hover:bg-rose-500 transition-colors duration-200 font-medium shadow-lg shadow-rose-200/50"
              >
                <span>Get Directions</span>
              </a>

              <a
                href="/products"
                className="inline-flex items-center space-x-2 backdrop-blur-sm bg-white/80 text-neutral-700 px-8 py-3 rounded-xl hover:bg-white transition-all duration-200 font-medium border border-neutral-200/50"
              >
                <span>Shop Online</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}