import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import type { Product, Category } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

async function getFeaturedProducts() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'products'),
      where('is_featured', '==', true),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCategories() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'categories'),
      orderBy('created_at', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-rose-50/20 to-amber-50/20">
      <Navbar />

      {/* HERO */}
      <section className="pt-32 pb-20 min-h-[90vh] flex items-center bg-cream relative overflow-hidden">
        {/* Abstract Background Decor */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-blush/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center w-full">

            {/* TEXT */}
            <div className="space-y-10 flex flex-col justify-center">
              <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-md border border-blush/10 px-6 py-2.5 rounded-full shadow-sm w-fit">
                <Heart className="h-4 w-4 text-blush" />
                <span className="text-xs font-black text-blush uppercase tracking-[0.2em]">
                  Welcome to Miks & Chiks
                </span>
              </div>

              <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-charcoal leading-[1.1] tracking-tight">
                Soft Wear for
                <span className="block italic text-blush"> Precious Moments</span>
              </h1>

              <p className="text-xl text-neutral-500 leading-relaxed max-w-xl font-sans">
                Crafted with care for moms and little ones, blending ultimate comfort with effortless premium style
              </p>

              <div className="flex flex-wrap gap-5">
                <Link
                  href="/products"
                  className="group inline-flex items-center space-x-3 bg-blush text-white px-10 py-5 rounded-2xl hover:bg-[#f48c82] transition-all duration-500 font-bold shadow-2xl shadow-blush/30 active:scale-95"
                >
                  <span className="uppercase tracking-widest text-xs">Shop Collection</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center space-x-3 bg-white text-charcoal px-10 py-5 rounded-2xl hover:bg-cream transition-all duration-300 font-bold border border-blush/10 shadow-sm active:scale-95"
                >
                  <span className="uppercase tracking-widest text-xs text-neutral-400">Learn More</span>
                </Link>
              </div>
            </div>

            {/* IMAGE */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blush/20 to-gold/20 rounded-[40px] blur-3xl" />
              <img
                src="/mother-baby.jpg"
                alt="Maternity Fashion"
                className="relative rounded-[40px] shadow-2xl w-full max-w-md mx-auto aspect-[4/5] object-cover object-top"
              />
            </div>

          </div>
        </div>
      </section>

      {/* CATEGORY */}
      <section className="py-24 bg-white rounded-[60px] my-12 mx-4 shadow-sm border border-[#F3E8E5]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                Shop by <span className="text-blush italic">Category</span>
              </h2>
              <p className="text-neutral-500 text-lg font-sans max-w-xl">
                Explore our carefully curated collections designed for every stage of your journey.
              </p>
            </div>
            <Link href="/products" className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blush hover:text-charcoal transition-colors">
                View Collections <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative isolate overflow-hidden rounded-[40px] h-[400px] backdrop-blur-sm bg-cream border border-blush/10 hover:shadow-2xl hover:shadow-blush/20 transition-all duration-700"
              >
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                <div className="absolute bottom-0 left-0 right-0 p-8 space-y-2">
                  <h3 className="text-3xl font-serif font-bold text-white tracking-tight">
                    {category.name}
                  </h3>
                  <p className="text-white/80 text-sm line-clamp-2 font-medium">
                    {category.description}
                  </p>
                  <div className="pt-4 flex items-center space-x-3 text-white font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500">
                    <span>Discover</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                Most <span className="text-blush italic">Loved</span>
              </h2>
              <p className="text-neutral-500 text-lg font-sans max-w-xl">
                Discover the pieces our community is currently obsessed with.
              </p>
            </div>
            
            <Link
              href="/products"
              className="inline-flex items-center space-x-3 bg-blush text-white px-10 py-4 rounded-2xl hover:bg-[#f48c82] transition-all duration-500 font-bold text-xs uppercase tracking-widest shadow-xl shadow-blush/20 active:scale-95"
            >
              <span>View All Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}