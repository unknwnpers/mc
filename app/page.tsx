import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/home/HeroSection';
import TrustStrip from '@/components/TrustStrip';
import BestSellers from '@/components/home/BestSellers';
import ShopByCategory from '@/components/home/ShopByCategory';
import { adminDb } from '@/lib/firebase-admin';
import type { Metadata } from 'next';
import type { Product, Category, CuratedCollection } from '@/lib/types';

// ── Dynamic imports for below-fold heavy sections (code-split) ──
const TrendingSection = nextDynamic(() => import('@/components/home/TrendingSection'));
const WhyChooseUs = nextDynamic(() => import('@/components/home/WhyChooseUs'));
const InstagramReels = nextDynamic(() => import('@/components/InstagramReels'));
const TestimonialsSection = nextDynamic(() => import('@/components/home/TestimonialsSection'));
const NewsletterSection = nextDynamic(() => import('@/components/home/NewsletterSection'));

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// ── SEO Metadata ──
export const metadata: Metadata = {
  title: 'Premium Maternity & Kids Wear | Miks & Chiks — Kochi',
  description: 'Discover premium maternity and kids wear at Miks & Chiks. Thoughtfully designed with the softest fabrics for comfort, elegance, and joy in every moment of motherhood. Free shipping above ₹699.',
  alternates: {
    canonical: 'https://miksandchiks.com',
  },
};

// ── Data fetching (server component) ──

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
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
        updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
      };
    }) as unknown as Category[];
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
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt || null,
      };
    }) as CuratedCollection[];
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

async function getNewArrivals(): Promise<Product[]> {
  try {
    const snapshot = await adminDb
      .collection('products')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(6)
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
    console.error('Error fetching new arrivals:', error);
    return [];
  }
}

async function getHomepageSettings() {
  try {
    const doc = await adminDb.collection('settings').doc('homepage').get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (error) {
    console.error('Error fetching homepage settings:', error);
  }
  return null;
}

async function getSocialSettings(): Promise<Record<string, string>> {
  try {
    const doc = await adminDb.collection('settings').doc('social_media').get();
    if (doc.exists) {
      return doc.data() as Record<string, string>;
    }
  } catch (error) {
    console.error('Error fetching social settings:', error);
  }
  return {};
}

// ── Structured Data (JSON-LD) ──
function StructuredData() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Miks & Chiks",
    url: "https://miksandchiks.com",
    logo: "https://miksandchiks.com/logo.png",
    description: "Premium maternity and kids wear brand based in Kochi, Kerala.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kochi",
      addressRegion: "Kerala",
      addressCountry: "IN",
    },
    sameAs: [
      "https://instagram.com/miksandchiks",
    ],
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Miks & Chiks",
    url: "https://miksandchiks.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://miksandchiks.com/products?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
    </>
  );
}

export default async function Home() {
  const [featuredProducts, categories, curatedCollections, heroImage, newArrivals, socialSettings, homepageSettings] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getCuratedCollections(),
    getHeroImage(),
    getNewArrivals(),
    getSocialSettings(),
    getHomepageSettings(),
  ]);

  return (
    <div className="min-h-screen bg-[#FFF9F6] font-sans">
      <StructuredData />
      <Navbar />

      {/* 1. Hero — above fold, critical */}
      <HeroSection heroImageUrl={heroImage?.url || '/mother-baby.jpg'} content={homepageSettings?.hero} />

      {/* 2. Trust Features — overlaps hero */}
      <TrustStrip />

      {/* 3. Best Sellers — primary conversion */}
      <BestSellers products={featuredProducts} />

      {/* 4. Shop by Category */}
      <ShopByCategory collections={curatedCollections} categories={categories} />

      {/* 5. Trending — dynamically imported */}
      <TrendingSection products={newArrivals} />

      {/* 6. Why Choose Us — dynamically imported */}
      <WhyChooseUs content={homepageSettings?.maternity} />

      {/* 7–9. Below fold, client-only for performance */}
      <Suspense fallback={<SectionSkeleton />}>
        <InstagramReels socialSettings={socialSettings} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <NewsletterSection />
      </Suspense>

      {/* 10. Footer */}
      <Footer socialSettings={socialSettings} />
    </div>
  );
}

// ── Premium section skeleton loader ──
function SectionSkeleton() {
  return (
    <div className="py-16 md:py-24">
      <div className="max-w-[1320px] mx-auto px-4 md:px-6">
        <div className="skeleton-premium h-5 w-32 mb-4" />
        <div className="skeleton-premium h-10 w-64 mb-6" />
        <div className="skeleton-premium h-4 w-96 max-w-full mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-premium aspect-[4/5] rounded-[28px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
