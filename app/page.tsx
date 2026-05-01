import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import { adminDb } from '@/lib/firebase-admin';
import type { Product, Category, CuratedCollection } from '@/lib/types';

// Force dynamic rendering - Firestore queries run at request time, not build time
// This avoids PERMISSION_DENIED errors during static generation
export const dynamic = 'force-dynamic';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

// Preload critical images used above the fold
export const preloadImages = [
  '/logo.png',
  '/hero-banner.jpg',
];

async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const snapshot = await adminDb
      .collection('products')
      .where('is_featured', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(8)
      .get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
      };
    }) as Product[];
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
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at,
      };
    }) as unknown as Category[];
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

async function getHeroImage(): Promise<{ url: string; id: string } | null> {
  try {
    const snapshot = await adminDb
      .collection('image_metadata')
      .where('isActive', '==', true)
      .where('category', '==', 'marketing')
      .where('subcategory', '==', 'homepage')
      .orderBy('uploadedAt', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      url: data.variants?.original?.url || '',
    };
  } catch (error: any) {
    console.error('Error fetching hero image:', error);
    return null;
  }
}

export default async function Home() {
  // Parallelize all data fetching for faster load
  const [featuredProducts, categories, curatedCollections, heroImage] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getCuratedCollections(),
    getHeroImage(),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-rose-50/20 to-amber-50/20">
      <Navbar />

      {/* HERO */}
      <HeroSection heroImageUrl={heroImage?.url} />

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