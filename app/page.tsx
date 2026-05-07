import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Heart, Star, ShoppingCart, Eye, Instagram, Play, Sparkles, ShieldCheck, Truck, RefreshCw, Banknote, ChevronRight, ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CollectionCard from '@/components/CollectionCard';
import InstagramReels from '@/components/InstagramReels';
import TrustStrip from '@/components/TrustStrip';
import { adminDb } from '@/lib/firebase-admin';
import type { Product, Category, CuratedCollection } from '@/lib/types';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

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
  } catch (error) {
    console.error('Error fetching products:', error);
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
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
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CuratedCollection[];
  } catch (error) {
    console.error('Error fetching curated collections:', error);
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
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return { id: doc.id, url: data.variants?.original?.url || '' };
  } catch (error) {
    console.error('Error fetching hero image:', error);
    return null;
  }
}

export default async function Home() {
  const [featuredProducts, categories, curatedCollections, heroImage] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getCuratedCollections(),
    getHeroImage(),
  ]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blush/20">
      <Navbar />

      {/* ── HERO SECTION ────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden bg-cream/20">
        {/* Animated Background Decor */}
        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-blush/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-amber-50/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Hero Text Content */}
            <div className="space-y-10 order-2 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-xl border border-blush/10 px-6 py-3 rounded-full shadow-sm mx-auto lg:ml-0">
                <Sparkles className="h-4 w-4 text-blush animate-pulse" />
                <span className="text-[10px] font-black text-blush uppercase tracking-[0.3em]">
                  Softness That Stays With You
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-[56px] md:text-[84px] lg:text-[100px] leading-[0.95] text-charcoal font-bold tracking-tighter">
                  Softness <span className="block italic text-blush/80 font-normal">That Stays</span>
                </h1>
                <p className="text-lg md:text-xl text-neutral-500 leading-relaxed max-w-[550px] mx-auto lg:ml-0 font-medium">
                  Thoughtfully designed maternity & kids wear that brings comfort, elegance and joy to every moment of motherhood.
                </p>
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-5 pt-4">
                <Link
                  href="/products"
                  className="group relative bg-[#E58F7C] text-white px-12 py-5 rounded-2xl hover:bg-[#d47f6d] transition-all duration-500 font-black text-xs uppercase tracking-widest shadow-2xl shadow-[#E58F7C]/30 active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Shop Collection <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center bg-white text-charcoal px-12 py-5 rounded-2xl hover:bg-cream transition-all duration-300 font-black text-xs uppercase tracking-widest border border-blush/10 shadow-sm active:scale-95"
                >
                  Explore Story
                </Link>
              </div>

              {/* Hero Trust Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 border-t border-blush/10">
                {[
                  { icon: Truck, text: "Free Shipping", sub: "Above ₹699" },
                  { icon: Banknote, text: "COD", sub: "Available" },
                  { icon: RefreshCw, text: "Easy Returns", sub: "7-Day Window" },
                  { icon: ShieldCheck, text: "Secure", sub: "Payments" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center lg:items-start gap-1">
                    <item.icon className="w-5 h-5 text-blush/60 mb-1" />
                    <p className="text-[10px] font-black text-charcoal uppercase tracking-widest leading-none">{item.text}</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image Section */}
            <div className="relative order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[500px] aspect-[4/5] group">
                {/* Floating Glassmorphism Trust Card */}
                <div className="absolute top-10 -left-10 z-20 bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-white/50 shadow-2xl animate-bounce-slow hidden md:block">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-cream" />)}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal">Trusted by 2,000+ Moms</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
                    <span className="text-xs font-bold text-charcoal ml-1">4.8 Rating</span>
                  </div>
                </div>

                <div className="absolute -bottom-10 -right-10 z-20 bg-blush/90 backdrop-blur-xl p-6 rounded-[32px] border border-white/20 shadow-2xl hidden md:block group-hover:translate-y-2 transition-transform duration-700">
                   <Heart className="w-6 h-6 text-white mb-2 fill-current" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">Made with Love <br/> in Kerala</p>
                </div>

                <div className="relative w-full h-full rounded-[60px] overflow-hidden shadow-2xl ring-1 ring-blush/10">
                  <Image
                    src={heroImage?.url || '/mother-baby.jpg'}
                    alt="Miks & Chiks Premium Maternity"
                    fill
                    priority
                    className="object-cover object-top hover:scale-105 transition-transform duration-[3s] ease-out"
                  />
                </div>

                {/* Parallax Decorative Shapes */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-2xl -z-10" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blush/10 rounded-full blur-3xl -z-10" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <TrustStrip />

      {/* ── CURATED COLLECTIONS ─────────────────────────────────── */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <div className="text-blush font-black text-xs uppercase tracking-[0.3em]">Exclusively Designed</div>
              <h2 className="text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                Curated <span className="text-blush italic">Collections</span>
              </h2>
            </div>
            <Link href="/products" className="group flex items-center gap-3 text-xs font-black uppercase tracking-widest text-blush hover:text-charcoal transition-colors">
              View All Collections <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
             {curatedCollections.length > 0 ? (
                curatedCollections.map((col, idx) => (
                  <div key={col.id} className={cn(
                    "relative",
                    idx === 0 ? "lg:col-span-8 h-[500px]" : "lg:col-span-4 h-[500px]"
                  )}>
                    <CollectionCard collection={col} />
                  </div>
                ))
             ) : (
                // Elegant placeholder cards if no curated content
                <>
                  <div className="lg:col-span-7 h-[600px] relative rounded-[60px] overflow-hidden group shadow-xl shadow-rose-100/10 border border-[#F3E8E5]">
                    <img src="https://images.unsplash.com/photo-1544126592-807daa215a05?q=80&w=1200" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                    <div className="absolute bottom-10 left-10 text-white space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Boutique Collection</p>
                      <h3 className="text-5xl font-serif font-bold italic leading-none">Motherhood <br/> Essentials</h3>
                      <Link href="/products" className="inline-flex items-center gap-3 bg-white text-charcoal px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blush hover:text-white transition-all">
                        Explore Collection
                      </Link>
                    </div>
                  </div>
                  <div className="lg:col-span-5 flex flex-col gap-8">
                     <div className="flex-1 relative rounded-[60px] overflow-hidden group shadow-xl shadow-rose-100/10 border border-[#F3E8E5]">
                        <img src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                        <div className="absolute bottom-8 left-8 text-white">
                           <h3 className="text-3xl font-serif font-bold italic mb-4">Newborn <br/> Bliss</h3>
                           <ChevronRight className="w-10 h-10 p-2.5 bg-white text-charcoal rounded-full group-hover:bg-blush group-hover:text-white transition-all" />
                        </div>
                     </div>
                     <div className="flex-1 relative rounded-[60px] overflow-hidden group shadow-xl shadow-rose-100/10 border border-[#F3E8E5]">
                        <img src="https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?q=80&w=800" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
                        <div className="absolute bottom-8 left-8 text-white">
                           <h3 className="text-3xl font-serif font-bold italic mb-4">Kids <br/> Fashion</h3>
                           <ChevronRight className="w-10 h-10 p-2.5 bg-white text-charcoal rounded-full group-hover:bg-blush group-hover:text-white transition-all" />
                        </div>
                     </div>
                  </div>
                </>
             )}
          </div>
        </div>
      </section>

      {/* ── PRODUCT CAROUSEL ──────────────────────────────────── */}
      <section className="py-24 bg-cream/20">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <div className="text-blush font-black text-xs uppercase tracking-[0.3em]">Trending Now</div>
              <h2 className="text-5xl font-serif font-bold text-charcoal tracking-tight leading-tight">
                Most <span className="text-blush italic">Loved</span>
              </h2>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex gap-2">
                  <button className="w-12 h-12 rounded-full border border-[#F3E8E5] bg-white flex items-center justify-center hover:bg-blush hover:text-white transition-all shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
                  <button className="w-12 h-12 rounded-full border border-[#F3E8E5] bg-white flex items-center justify-center hover:bg-blush hover:text-white transition-all shadow-sm"><ChevronRight className="w-5 h-5" /></button>
               </div>
               <Link href="/products" className="bg-blush text-white px-10 py-4 rounded-2xl hover:bg-[#f48c82] transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-blush/20 ml-4">View All</Link>
            </div>
          </div>

          <div className="flex gap-8 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory">
            {featuredProducts.map((product) => (
              <div key={product.id} className="min-w-[300px] md:min-w-[400px] snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <InstagramReels />

      <Footer />
    </div>
  );
}
