'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import type { Product, Category } from '@/lib/types';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Search, SlidersHorizontal, ArrowUpDown, Tag, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FILTERS STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const selectedCategory = searchParams.get('category');

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sort, search]);

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const constraints: any[] = [];

      // 1. ACTIVE PRODUCTS ONLY (CRITICAL FIX)
      constraints.push(where("isActive", "==", true));

      // 2. CATEGORY FILTER
      if (selectedCategory && selectedCategory !== 'all') {
        constraints.push(where("category_slug", "==", selectedCategory));
      }

      // 3. SORTING - Only createdAt in query, price sort done in-memory
      constraints.push(orderBy("createdAt", "desc"));

      const q = query(collection(db, "products"), ...constraints);
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      // 4. IN-MEMORY PRICE SORT (since price is in variants)
      if (sort === "price_low") {
        data.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0;
          const priceB = b.variants?.[0]?.price || 0;
          return priceA - priceB;
        });
      } else if (sort === "price_high") {
        data.sort((a, b) => {
          const priceA = a.variants?.[0]?.price || 0;
          const priceB = b.variants?.[0]?.price || 0;
          return priceB - priceA;
        });
      }
      // else: already sorted by createdAt desc

      // 5. SEARCH (Client-side)
      if (search) {
        const term = search.toLowerCase();
        data = data.filter(p => 
          p.name.toLowerCase().includes(term) || 
          p.description?.toLowerCase().includes(term)
        );
      }

      setProducts(data);
    } catch (error) {
      console.error('Filtering Query Error:', error);
      
      // Fallback: If query fails, fetch all and filter in memory
      try {
        const snapshot = await getDocs(collection(db, "products"));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        
        // Manual filter - ACTIVE + CATEGORY
        data = data.filter(p => p.isActive !== false);
        if (selectedCategory && selectedCategory !== 'all') {
          data = data.filter(p => p.category_slug === selectedCategory);
        }
        
        // Manual sort
        if (sort === "price_low") {
          data.sort((a, b) => {
            const priceA = a.variants?.[0]?.price || 0;
            const priceB = b.variants?.[0]?.price || 0;
            return priceA - priceB;
          });
        } else if (sort === "price_high") {
          data.sort((a, b) => {
            const priceA = a.variants?.[0]?.price || 0;
            const priceB = b.variants?.[0]?.price || 0;
            return priceB - priceA;
          });
        } else {
          data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }

        // Manual search
        if (search) {
          const term = search.toLowerCase();
          data = data.filter(p => p.name.toLowerCase().includes(term));
        }
        
        setProducts(data);
      } catch (fallbackErr) {
        console.error('Critical Fetch Failure:', fallbackErr);
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          
          {/* 🔹 Header section */}
          <div className="mt-10 mb-12">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-charcoal tracking-tight">
              Explore Our <span className="text-blush italic">Collections</span>
            </h1>
            <p className="text-neutral-500 mt-6 max-w-lg text-lg font-sans leading-relaxed">
              Premium maternity and kids wear crafted for your most precious moments.
            </p>
          </div>

          {/* 🔹 Filters + Search + Sort Row (Consolidated for Alignment) */}
          <div className="space-y-8 mb-16">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  "px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 transform active:scale-95",
                  !selectedCategory
                    ? "bg-blush text-white shadow-xl shadow-blush/20 scale-105"
                    : "bg-white border border-[#F3E8E5] text-charcoal/60 hover:bg-blush/5 hover:border-blush/30 hover:text-blush"
                )}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={cn(
                    "px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 transform active:scale-95",
                    selectedCategory === cat.slug
                      ? "bg-blush text-white shadow-xl shadow-blush/20 scale-105"
                      : "bg-white border border-[#F3E8E5] text-charcoal/60 hover:bg-blush/5 hover:border-blush/30 hover:text-blush"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="relative w-full md:w-3/5 lg:w-1/2 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 group-focus-within:text-blush transition-colors" />
                <input
                  type="text"
                  placeholder="Search our premium collection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-16 pr-8 py-4.5 rounded-[20px] border border-[#F3E8E5] bg-white text-charcoal placeholder:text-neutral-400 focus:outline-none focus:border-blush/50 focus:ring-4 focus:ring-blush/10 transition-all font-sans"
                />
              </div>

              <div className="relative w-full md:w-72">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-8 py-4.5 rounded-[20px] border border-[#F3E8E5] bg-white text-charcoal font-bold text-xs uppercase tracking-widest appearance-none focus:outline-none focus:border-blush/50 focus:ring-4 focus:ring-blush/10 transition-all cursor-pointer"
                  >
                    <option value="latest">Sort: Latest Arrivals</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                  <ArrowUpDown className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 🧱 3. PRODUCT GRID */}
          <div className="mt-10">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-6">
                    <Skeleton className="aspect-[4/5] w-full rounded-[32px] bg-cream/50" />
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-3/4 rounded-lg" />
                        <Skeleton className="h-4 w-1/4 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* 💎 5. EMPTY STATE */
              <div className="text-center py-40 bg-cream/20 rounded-[60px] border border-dashed border-blush/20">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-xl shadow-blush/5 border border-[#F3E8E5]">
                  <Tag className="h-10 w-10 text-blush opacity-20" />
                </div>
                <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">
                  No products <span className="text-blush italic">Found</span>
                </h2>
                <p className="text-neutral-500 max-w-xs mx-auto text-lg leading-relaxed mb-12">
                  We couldn't find anything matching your search. Try different filters!
                </p>
                {(search || selectedCategory) && (
                  <button 
                    onClick={() => {
                      setSearchTerm("");
                      setSearch("");
                      handleCategoryChange(null);
                    }}
                    className="bg-charcoal text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blush transition-all shadow-2xl shadow-charcoal/20 transform hover:-translate-y-1"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-400 border-t-transparent"></div>
            </div>
        }>
            <ProductsContent />
        </Suspense>
    );
}