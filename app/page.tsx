import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import type { Product, Category } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

async function getFeaturedProducts() {
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
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-h-[80vh] flex items-center">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">

            {/* TEXT */}
            <div className="space-y-6 flex flex-col justify-center">
              <div className="inline-flex items-center space-x-2 backdrop-blur-sm bg-rose-100/50 px-4 py-2 rounded-full">
                <Heart className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-medium text-rose-600">
                  Welcome to Miks & Chiks
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-800 leading-tight">
                Soft Wear for
                <span className="block text-rose-400"> Precious Moments</span>
              </h1>

              <p className="text-lg text-neutral-600 leading-relaxed max-w-xl">
                Crafted with care for moms and little ones, blending comfort with effortless style
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="group inline-flex items-center space-x-2 bg-rose-400 text-white px-8 py-4 rounded-xl hover:bg-rose-500 transition-all duration-200 font-medium shadow-lg shadow-rose-200/50"
                >
                  <span>Shop Now</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center space-x-2 backdrop-blur-sm bg-white/60 text-neutral-700 px-8 py-4 rounded-xl hover:bg-white/80 transition-all duration-200 font-medium border border-neutral-200/50"
                >
                  <span>Learn More</span>
                </Link>
              </div>
            </div>

            {/* IMAGE */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-200/30 to-amber-200/30 rounded-3xl blur-3xl" />
              <img
                src="/mother-baby.jpg"
                alt="Maternity Fashion"
                className="relative rounded-3xl shadow-2xl w-full max-w-md mx-auto aspect-[4/5] object-cover object-top"
              />
            </div>

          </div>
        </div>
      </section>

      {/* CATEGORY */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-800 mb-4">
              Shop by Category
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Explore our carefully curated collections
            </p>
          </div>

          {/* 🔥 UPDATED GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                // className="group relative overflow-hidden rounded-3xl aspect-[4/3] backdrop-blur-sm bg-white/60 border border-neutral-200/50 hover:shadow-2xl hover:shadow-rose-100/50 transition-all duration-300"
                className="group relative isolate overflow-hidden rounded-3xl h-[240px] sm:h-[260px] lg:h-[280px] backdrop-blur-sm bg-white/60 border border-neutral-200/50 hover:shadow-2xl hover:shadow-rose-100/50 transition-all duration-300"
              >
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {category.name}
                  </h3>
                  <p className="text-white/90 text-sm mb-2">
                    {category.description}
                  </p>
                  <span className="inline-flex items-center space-x-2 text-white font-medium group-hover:translate-x-2 transition-transform">
                    <span>Explore</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-neutral-800 mb-4">
              Featured Products
            </h2>
            <p className="text-neutral-600 max-w-2xl mx-auto">
              Our most loved pieces, handpicked just for you
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/products"
              className="inline-flex items-center space-x-2 bg-neutral-800 text-white px-8 py-4 rounded-xl hover:bg-neutral-900 transition-all duration-200 font-medium"
            >
              <span>View All Products</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}