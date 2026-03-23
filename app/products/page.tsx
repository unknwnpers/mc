'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db, Product, Category } from '@/lib/firebase';
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

      // 1. CATEGORY FILTER
      if (selectedCategory && selectedCategory !== 'all') {
        constraints.push(where("category_slug", "==", selectedCategory));
      }

      // 2. SORTING
      if (sort === "price_low") {
        constraints.push(orderBy("price", "asc"));
      } else if (sort === "price_high") {
        constraints.push(orderBy("price", "desc"));
      } else {
        // Use created_at by default
        constraints.push(orderBy("created_at", "desc"));
      }

      const q = query(collection(db, "products"), ...constraints);
      const snapshot = await getDocs(q);
      
      let data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      // 3. SEARCH (Client-side)
      if (search) {
        const term = search.toLowerCase();
        data = data.filter(p => 
          p.name.toLowerCase().includes(term) || 
          p.description?.toLowerCase().includes(term)
        );
      }

      setProducts(data);
    } catch (error) {
      console.error('Filtering Query Error (check if index is required):', error);
      
      // Fallback: If query fails (likely missing index), fetch all and filter in memory for consistency
      try {
        const snapshot = await getDocs(collection(db, "products"));
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        
        // Manual filter
        if (selectedCategory && selectedCategory !== 'all') {
          data = data.filter(p => p.category_slug === selectedCategory);
        }
        
        // Manual sort
        if (sort === "price_low") data.sort((a, b) => a.price - b.price);
        else if (sort === "price_high") data.sort((a, b) => b.price - a.price);
        else data.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0));

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

      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
                <h1 className="text-5xl font-black text-neutral-900 mb-4 tracking-tighter">
                  Explore <span className="text-rose-400">Collections</span>
                </h1>
                <p className="text-neutral-500 text-lg font-medium">
                  Premium maternity and kids wear for every moment
                </p>
            </div>
            
            <div className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100">
                <button 
                  onClick={() => handleCategoryChange(null)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                    !selectedCategory ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.slug)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-bold transition-all capitalize",
                      selectedCategory === cat.slug ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-col lg:flex-row gap-4 mb-10 items-center justify-between">
            <div className="relative w-full lg:max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 group-focus-within:text-rose-400 transition-colors" />
              <input
                type="text"
                placeholder="Search by name or style..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-50 border-none px-12 py-4 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all font-medium text-neutral-700 placeholder:text-neutral-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => {
                    setSearchTerm("");
                    setSearch("");
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 rounded-full transition-colors"
                >
                  <X className="h-4 w-4 text-neutral-400" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-none">
                    <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="w-full lg:w-56 bg-white border border-neutral-200 pl-11 pr-4 py-4 rounded-2xl appearance-none focus:ring-2 focus:ring-rose-200 font-bold text-sm text-neutral-700 cursor-pointer shadow-sm"
                    >
                        <option value="latest">Sort by: Latest</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                    </select>
                </div>
                
                <div className="h-14 w-14 bg-white border border-neutral-200 rounded-2xl flex items-center justify-center text-neutral-400 hover:text-rose-500 cursor-pointer shadow-sm transition-colors">
                    <SlidersHorizontal className="h-5 w-5" />
                </div>
            </div>
          </div>

          {/* GRID */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-neutral-50 rounded-[40px] border border-dashed border-neutral-200">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Tag className="h-10 w-10 text-neutral-200" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-800 mb-2">No products found</h3>
              <p className="text-neutral-500 mb-8 max-w-xs mx-auto">We couldn't find anything matching your current filters. Try adjusting them!</p>
              {(search || selectedCategory) && (
                <button 
                  onClick={() => {
                    setSearch("");
                    handleCategoryChange(null);
                  }}
                  className="bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all shadow-lg active:scale-95"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
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