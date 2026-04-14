import Link from 'next/link';
import { ArrowRight, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { adminDb } from '@/lib/firebase-admin';
import type { Product, Category, CuratedCollection } from '@/lib/types';

// Force dynamic rendering - Firestore queries run at request time, not build time
// This avoids PERMISSION_DENIED errors during static generation
export const dynamic = 'force-dynamic';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const snapshot = await adminDb
      .collection('products')
      .where('is_featured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
  } catch (error: any) {
    console.error('Error fetching products:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error stack:', error.stack);
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const snapshot = await adminDb
      .collection('categories')
      .orderBy('created_at', 'asc')
      .limit(20)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    return [];
  }
}

async function getCuratedCollections(): Promise<CuratedCollection[]> {
  try {
    const snapshot = await adminDb
      .collection('curated_collections')
      .where('isActive', '==', true)
      .orderBy('displayOrder', 'asc')
      .limit(6)
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Serialize Firestore Timestamps to plain objects
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    }) as CuratedCollection[];
  } catch (error: any) {
    console.error('Error fetching curated collections:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const categories = await getCategories();
  const curatedCollections = await getCuratedCollections();

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

              <div className="space-y-2">
                <h1 className="font-serif text-[48px] md:text-[68px] leading-[1.1] text-[#2B2B2B] font-medium tracking-[-0.5px]">
                  Softness That
                </h1>
                <h1 className="font-serif italic text-[44px] md:text-[64px] leading-[1.1] text-[#E6A79C] font-normal">
                  Stays With You
                </h1>
                <h2 className="font-serif italic text-[24px] md:text-[30px] text-[#7A7A7A] mt-4">
                  Through Every Tiny Moment
                </h2>
              </div>

              <p className="text-lg md:text-xl text-neutral-500 leading-relaxed max-w-[550px] font-sans">
                Not just clothing — a gentle embrace for mothers and their little ones. 
                Thoughtfully designed pieces that feel as comforting as your touch.
              </p>

              <div className="flex flex-wrap gap-5">
                <Link
                  href="/products"
                  className="group inline-flex items-center space-x-3 bg-[#E58F7C] text-white px-10 py-5 rounded-2xl hover:bg-[#d47f6d] transition-all duration-500 font-bold shadow-2xl shadow-[#E58F7C]/30 active:scale-95"
                >
                  <span className="uppercase tracking-widest text-xs">Shop Collection</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center space-x-3 bg-white text-charcoal px-10 py-5 rounded-2xl hover:bg-cream transition-all duration-300 font-bold border border-blush/10 shadow-sm active:scale-95"
                >
                  <span className="uppercase tracking-widest text-xs text-neutral-400">Explore Story</span>
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

      {/* CURATED COLLECTIONS */}
      <section className="py-24 bg-white rounded-[60px] my-12 mx-4 shadow-sm border border-[#F3E8E5]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                Curated <span className="text-blush italic">Collections</span>
              </h2>
              <p className="text-neutral-500 text-lg font-sans max-w-xl">
                Discover thoughtfully selected essentials for every stage of motherhood.
              </p>
            </div>
            <Link href="/products" className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blush hover:text-charcoal transition-colors">
              View Collections <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          {curatedCollections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {curatedCollections.map((collection: CuratedCollection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            // Fallback to categories if no curated collections
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="group relative isolate overflow-hidden rounded-[40px] h-[400px] backdrop-blur-sm bg-cream border border-blush/10 hover:shadow-2xl hover:shadow-blush/20 transition-all duration-700"
                >
                  <img
                    src={category.image_url}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
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
                    <div className="pt-4 flex items-center space-x-3 text-white font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all duration-500">
                      <span>Discover</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

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