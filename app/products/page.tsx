'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import type { Product, Category } from '@/lib/types';
import { Search, SlidersHorizontal, ArrowUpDown, Tag, X, IndianRupee, Ruler, ChevronRight, Home, Eye, ShoppingBag, Heart, Clock, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PRODUCT_CATEGORIES, normalizeUrlCategory } from '@/lib/constants';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FILTERS STATE
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const urlCategory = searchParams.get('category');
  const selectedCategory = urlCategory ? normalizeUrlCategory(urlCategory) : null;
  const collectionId = searchParams.get('collection');
  
  // Auto collection filter params
  const featuredFilter = searchParams.get('featured') === 'true';
  const newFilter = searchParams.get('new') === 'true';
  const maxPriceFilter = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null;
  const limitFilter = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;

  // Price Range State
  const urlMinPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null;
  const urlMaxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null;
  const [minPrice, setMinPrice] = useState<number | ''>(urlMinPrice || '');
  const [maxPrice, setMaxPrice] = useState<number | ''>(urlMaxPrice || '');
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);

  // Size Filter State
  const urlSizes = searchParams.get('sizes')?.split(',').filter(Boolean) || [];
  const [selectedSizes, setSelectedSizes] = useState<string[]>(urlSizes);
  const [sizeFilterOpen, setSizeFilterOpen] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  // Sort Dropdown State
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortOptions = [
    { value: 'latest', label: 'Latest Arrivals' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
  ];

  // Pagination State
  const ITEMS_PER_PAGE = 12;
  const urlPage = parseInt(searchParams.get('page') || '1');
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [totalProducts, setTotalProducts] = useState(0);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);

  // Quick View State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedQuickViewSize, setSelectedQuickViewSize] = useState<string>('');

  // Wishlist State (Backend instead of localStorage)
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Fetch favorites from Firestore on mount/user change
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setWishlist([]);
        return;
      }
      try {
        const ref = collection(db, "users", user.uid, "favorites");
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => doc.id);
        setWishlist(items);
      } catch (err) {
        console.error("Error fetching favorites:", err);
      }
    };
    fetchFavorites();
  }, [user]);

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.info("Please login to save items");
      router.push('/login');
      return;
    }

    const isSaved = wishlist.includes(productId);

    // Optimistic UI update
    setWishlist(prev => 
      isSaved ? prev.filter(id => id !== productId) : [...prev, productId]
    );

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId })
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      if (result.isFavorite) {
        setWishlist(prev => prev.includes(productId) ? prev : [...prev, productId]);
        toast.success("Added to saved items");
      } else {
        setWishlist(prev => prev.filter(id => id !== productId));
        toast.info("Removed from saved items");
      }
    } catch (err) {
      console.error("Favorite error:", err);
      // Revert optimistic update
      setWishlist(prev => 
        isSaved ? [...prev, productId] : prev.filter(id => id !== productId)
      );
      toast.error("Failed to update saved items");
    }
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Recently Viewed State
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Load recently viewed from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('miks-chiks-recently-viewed');
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        // Filter out current products from the list to avoid duplicates
        const filteredIds = ids.slice(0, 8); // Keep last 8
        // Will fetch these products after main products load
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
  }, []);

  // Add product to recently viewed
  const addToRecentlyViewed = (product: Product) => {
    const saved = localStorage.getItem('miks-chiks-recently-viewed');
    let ids: string[] = [];
    if (saved) {
      try {
        ids = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
    // Remove if already exists and add to front
    ids = ids.filter(id => id !== product.id);
    ids.unshift(product.id);
    // Keep only last 8
    ids = ids.slice(0, 8);
    localStorage.setItem('miks-chiks-recently-viewed', JSON.stringify(ids));
  };

  // Use constants for categories to ensure slug consistency with products
  const categories = useMemo(() => Object.entries(PRODUCT_CATEGORIES).map(([slug, name]) => ({
    id: slug,
    slug,
    name
  })), []);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sort, search, collectionId, featuredFilter, newFilter, urlMinPrice, urlMaxPrice, searchParams.get('sizes'), limitFilter, urlPage]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Build query params for API
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (urlPage > 1) params.set('page', urlPage.toString());
      if (featuredFilter) params.set('featured', 'true');
      if (newFilter) params.set('new', 'true');
      if (urlMinPrice !== null) params.set('minPrice', urlMinPrice.toString());
      if (urlMaxPrice !== null) params.set('maxPrice', urlMaxPrice.toString());
      if (urlSizes.length > 0) params.set('sizes', urlSizes.join(','));
      
      // Call the API
      const response = await fetch(`/api/products?${params.toString()}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products');
      }
      
      setProducts(result.products);
      setPaginatedProducts(result.products);
      setTotalProducts(result.total);
      setCurrentPage(result.page);
      
      // Extract available sizes from all products
      const allSizes = new Set<string>();
      result.products.forEach((product: Product) => {
        product.variants?.forEach(variant => {
          const size = variant.options?.Size;
          if (size) allSizes.add(size);
        });
      });
      
      // Sort sizes in logical order
      const sortedSizes = Array.from(allSizes).sort((a, b) => {
        const numA = parseFloat(a.replace(/[^0-9.-]/g, ''));
        const numB = parseFloat(b.replace(/[^0-9.-]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
      setAvailableSizes(sortedSizes);
      
      // Load recently viewed products
      const savedRecent = localStorage.getItem('miks-chiks-recently-viewed');
      if (savedRecent) {
        try {
          const recentIds = JSON.parse(savedRecent) as string[];
          const recentProducts = result.products.filter((p: Product) => recentIds.includes(p.id));
          const sortedRecent = recentIds
            .map(id => recentProducts.find((p: Product) => p.id === id))
            .filter((p): p is Product => p !== undefined);
          setRecentlyViewed(sortedRecent);
        } catch (e) {
          console.error('Failed to load recently viewed:', e);
        }
      }
    } catch (error) {
      console.error('Products API Error:', error);
      setProducts([]);
      setPaginatedProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = useCallback((slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    // Reset to page 1 when changing category
    params.delete('page');
    if (slug) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    router.push(`/products?${params.toString()}`);
    // Scroll to top of products
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, router]);

  // Helper to remove a filter
  const removeFilter = useCallback((key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'priceRange') {
      params.delete('minPrice');
      params.delete('maxPrice');
      setMinPrice('');
      setMaxPrice('');
    } else if (key === 'sizes') {
      params.delete('sizes');
      setSelectedSizes([]);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  }, [searchParams, router]);

  // Helper to clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setSearch("");
    router.push('/products');
  }, [router]);

  // Build active filters list
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = [];
    
    if (selectedCategory) {
      const catName = categories.find(c => c.slug === selectedCategory)?.name || selectedCategory;
      filters.push({ key: 'category', label: 'Category', value: catName });
    }
    if (search) {
      filters.push({ key: 'search', label: 'Search', value: search });
    }
    if (collectionId) {
      filters.push({ key: 'collection', label: 'Collection', value: collectionId });
    }
    if (featuredFilter) {
      filters.push({ key: 'featured', label: 'Featured', value: 'Yes' });
    }
    if (newFilter) {
      filters.push({ key: 'new', label: 'New Arrivals', value: 'Yes' });
    }
    if (urlMinPrice !== null || urlMaxPrice !== null) {
      const min = urlMinPrice !== null ? `₹${urlMinPrice}` : '₹0';
      const max = urlMaxPrice !== null ? `₹${urlMaxPrice}` : '∞';
      filters.push({ key: 'priceRange', label: 'Price', value: `${min} - ${max}` });
    }
    if (urlSizes.length > 0) {
      filters.push({ key: 'sizes', label: 'Size', value: urlSizes.join(', ') });
    }
    
    return filters;
  }, [selectedCategory, search, collectionId, featuredFilter, newFilter, urlMinPrice, urlMaxPrice, urlSizes, categories]);

  const hasActiveFilters = activeFilters.length > 0 || search;

  // Build breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; href?: string; isActive?: boolean }[] = [
      { label: 'Home', href: '/' },
      { label: 'Shop', href: '/products' },
    ];

    if (selectedCategory) {
      const catName = categories.find(c => c.slug === selectedCategory)?.name || selectedCategory;
      crumbs.push({ label: catName, isActive: true });
    } else if (search) {
      crumbs.push({ label: `Search: "${search}"`, isActive: true });
    } else if (collectionId) {
      crumbs.push({ label: 'Collection', isActive: true });
    } else {
      crumbs[crumbs.length - 1].isActive = true;
    }

    return crumbs;
  }, [selectedCategory, search, collectionId, categories]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          
          {/* 🔹 Breadcrumbs */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center flex-wrap gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-neutral-300 mx-2" />
                  )}
                  {crumb.isActive ? (
                    <span className="font-bold text-charcoal">{crumb.label}</span>
                  ) : (
                    <a
                      href={crumb.href}
                      className="text-neutral-500 hover:text-blush transition-colors flex items-center gap-1"
                    >
                      {index === 0 && <Home className="w-4 h-4" />}
                      {crumb.label}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* 🔹 Header section */}
          <div className="mt-6 mb-6">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal tracking-tight">
              The <span className="text-blush italic">Collection</span>
            </h1>
            <p className="text-neutral-500 mt-3 max-w-lg text-base font-sans leading-relaxed">
              Thoughtfully curated essentials for mothers and children, crafted with care.
            </p>
          </div>

          {/* 🔹 Filters + Search + Sort Row (Consolidated for Alignment) */}
          <div className="space-y-4 mb-12">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 active:scale-95 hover:shadow-md",
                  !selectedCategory
                    ? "bg-blush text-white font-semibold shadow-lg shadow-blush/20"
                    : "bg-white border border-neutral-300 text-charcoal/70 hover:border-blush hover:text-blush hover:scale-105"
                )}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={cn(
                    "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 active:scale-95 hover:shadow-md",
                    selectedCategory === cat.slug
                      ? "bg-blush text-white font-semibold shadow-lg shadow-blush/20"
                      : "bg-white border border-neutral-300 text-charcoal/70 hover:border-blush hover:text-blush hover:scale-105"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Unified Toolbar - Search, Sort, Filters */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 group-focus-within:text-blush transition-colors" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-300 bg-white text-charcoal text-sm placeholder:text-neutral-400 focus:outline-none focus:border-blush focus:ring-2 focus:ring-blush/20 focus:shadow-md transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className={cn(
                    "h-11 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-95",
                    sortDropdownOpen
                      ? "border-blush bg-blush/5 text-blush"
                      : "border-neutral-300 bg-white text-charcoal hover:border-blush hover:text-blush"
                  )}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {sortOptions.find(o => o.value === sort)?.label || 'Sort'}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", sortDropdownOpen && "rotate-180")} />
                </button>

                {/* Sort Dropdown Menu */}
                {sortDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl border border-neutral-200 shadow-xl py-1 z-50">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSort(option.value);
                          setSortDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-neutral-50",
                          sort === option.value ? "text-blush bg-blush/5" : "text-charcoal"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Range Filter */}
              <div className="relative">
                <button
                  onClick={() => setPriceRangeOpen(!priceRangeOpen)}
                  className={cn(
                    "h-11 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-95",
                    priceRangeOpen || (urlMinPrice || urlMaxPrice)
                      ? "border-blush bg-blush text-white shadow-lg shadow-blush/20"
                      : "border-neutral-300 bg-white text-charcoal hover:border-blush hover:text-blush"
                  )}
                >
                  <IndianRupee className="w-4 h-4" />
                  <span className="hidden sm:inline">Price</span>
                  {(urlMinPrice || urlMaxPrice) && (
                    <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                      {urlMinPrice || '0'}-{urlMaxPrice || '∞'}
                    </span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", priceRangeOpen && "rotate-180")} />
                </button>

                {/* Price Range Dropdown */}
                {priceRangeOpen && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-[20px] border border-[#F3E8E5] shadow-xl p-6 z-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Price Range</span>
                      <button
                        onClick={() => setPriceRangeOpen(false)}
                        className="text-neutral-400 hover:text-charcoal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative flex-1">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="number"
                          placeholder="Min"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F3E8E5] text-sm focus:outline-none focus:border-blush/50 focus:ring-2 focus:ring-blush/10"
                        />
                      </div>
                      <span className="text-neutral-400">-</span>
                      <div className="relative flex-1">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="number"
                          placeholder="Max"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#F3E8E5] text-sm focus:outline-none focus:border-blush/50 focus:ring-2 focus:ring-blush/10"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { min: 0, max: 500, label: 'Under ₹500' },
                        { min: 500, max: 1000, label: '₹500 - ₹1000' },
                        { min: 1000, max: 2000, label: '₹1000 - ₹2000' },
                        { min: 2000, max: 5000, label: '₹2000+' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setMinPrice(preset.min);
                            setMaxPrice(preset.max);
                          }}
                          className="px-3 py-2 text-xs font-medium text-neutral-600 bg-neutral-50 rounded-lg hover:bg-blush/10 hover:text-blush transition-colors text-left"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setMinPrice('');
                          setMaxPrice('');
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete('minPrice');
                          params.delete('maxPrice');
                          router.push(`/products?${params.toString()}`);
                          setPriceRangeOpen(false);
                        }}
                        className="flex-1 py-2.5 text-xs font-bold text-neutral-500 hover:text-charcoal transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          if (minPrice) params.set('minPrice', minPrice.toString());
                          else params.delete('minPrice');
                          if (maxPrice) params.set('maxPrice', maxPrice.toString());
                          else params.delete('maxPrice');
                          router.push(`/products?${params.toString()}`);
                          setPriceRangeOpen(false);
                        }}
                        className="flex-1 py-2.5 bg-blush text-white text-xs font-bold rounded-xl hover:bg-blush/90 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Size Filter */}
              <div className="relative">
                <button
                  onClick={() => setSizeFilterOpen(!sizeFilterOpen)}
                  className={cn(
                    "h-11 px-4 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-95",
                    sizeFilterOpen || urlSizes.length > 0
                      ? "border-blush bg-blush text-white shadow-lg shadow-blush/20"
                      : "border-neutral-300 bg-white text-charcoal hover:border-blush hover:text-blush"
                  )}
                >
                  <Ruler className="w-4 h-4" />
                  <span className="hidden sm:inline">Size</span>
                  {urlSizes.length > 0 && (
                    <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                      {urlSizes.length}
                    </span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", sizeFilterOpen && "rotate-180")} />
                </button>

                {/* Size Filter Dropdown */}
                {sizeFilterOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-[20px] border border-[#F3E8E5] shadow-xl p-5 z-50">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Select Sizes</span>
                      <button
                        onClick={() => setSizeFilterOpen(false)}
                        className="text-neutral-400 hover:text-charcoal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {availableSizes.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto">
                          {availableSizes.map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                const newSizes = selectedSizes.includes(size)
                                  ? selectedSizes.filter(s => s !== size)
                                  : [...selectedSizes, size];
                                setSelectedSizes(newSizes);
                              }}
                              className={cn(
                                "px-3 py-2 text-xs font-bold rounded-lg transition-all",
                                selectedSizes.includes(size)
                                  ? "bg-blush text-white shadow-md"
                                  : "bg-neutral-50 text-neutral-600 hover:bg-blush/10 hover:text-blush"
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedSizes([]);
                              const params = new URLSearchParams(searchParams.toString());
                              params.delete('sizes');
                              router.push(`/products?${params.toString()}`);
                              setSizeFilterOpen(false);
                            }}
                            className="flex-1 py-2.5 text-xs font-bold text-neutral-500 hover:text-charcoal transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => {
                              const params = new URLSearchParams(searchParams.toString());
                              if (selectedSizes.length > 0) {
                                params.set('sizes', selectedSizes.join(','));
                              } else {
                                params.delete('sizes');
                              }
                              router.push(`/products?${params.toString()}`);
                              setSizeFilterOpen(false);
                            }}
                            className="flex-1 py-2.5 bg-blush text-white text-xs font-bold rounded-xl hover:bg-blush/90 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-neutral-400 text-center py-4">No sizes available</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 🔹 Active Filters & Product Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              {/* Product Count */}
              <p className="text-sm text-neutral-500">
                {!loading && (
                  <>
                    Showing <span className="font-bold text-charcoal">{paginatedProducts.length}</span> of <span className="font-bold text-charcoal">{totalProducts}</span> product{totalProducts !== 1 ? 's' : ''}
                  </>
                )}
              </p>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3" />
                    Filters ({activeFilters.length}):
                  </span>
                  {activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => {
                        if (filter.key === 'search') {
                          setSearchTerm("");
                          setSearch("");
                        }
                        removeFilter(filter.key);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blush text-white rounded-lg text-xs font-semibold hover:bg-blush/90 transition-all duration-200 group shadow-sm hover:shadow-md active:scale-95"
                    >
                      <span>{filter.label}: {filter.value}</span>
                      <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-bold text-neutral-500 hover:text-blush hover:bg-neutral-100 px-2 py-1 rounded transition-all duration-200 ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}
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
            ) : paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                  {paginatedProducts.map((product) => (
                    <div key={product.id} className="relative group">
                      <ProductCard product={product} />
                      {/* Action Buttons */}
                      <div className="absolute top-4 right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        {/* Wishlist Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product.id);
                          }}
                          className={cn(
                            "p-2.5 rounded-full shadow-lg backdrop-blur-sm transition-all z-10",
                            isInWishlist(product.id)
                              ? "bg-blush text-white"
                              : "bg-white/90 text-charcoal hover:bg-blush hover:text-white"
                          )}
                          aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart className={cn("w-4 h-4", isInWishlist(product.id) && "fill-current")} />
                        </button>

                        {/* Quick View Button */}
                        <button
                          onClick={() => {
                            setQuickViewProduct(product);
                            setSelectedQuickViewSize('');
                            addToRecentlyViewed(product);
                          }}
                          className="bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-blush hover:text-white text-charcoal z-10 transition-all"
                          aria-label="Quick view"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalProducts > ITEMS_PER_PAGE && (
                  <div className="mt-16 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          currentPage === 1
                            ? "text-neutral-300 cursor-not-allowed"
                            : "text-charcoal hover:bg-blush/10 hover:text-blush"
                        )}
                      >
                        ← Prev
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(totalProducts / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                          .filter(page => {
                            const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
                            // Show first, last, current, and neighbors
                            return (
                              page === 1 ||
                              page === totalPages ||
                              Math.abs(page - currentPage) <= 1
                            );
                          })
                          .reduce((acc: (number | string)[], page, index, arr) => {
                            if (index > 0 && (arr[index - 1] as number) !== page - 1) {
                              acc.push('...');
                            }
                            acc.push(page);
                            return acc;
                          }, [])
                          .map((page, index) => (
                            page === '...' ? (
                              <span key={`ellipsis-${index}`} className="px-2 text-neutral-400">...</span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page as number)}
                                className={cn(
                                  "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                                  currentPage === page
                                    ? "bg-blush text-white shadow-lg shadow-blush/20"
                                    : "text-charcoal hover:bg-blush/10 hover:text-blush"
                                )}
                              >
                                {page}
                              </button>
                            )
                          ))}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= Math.ceil(totalProducts / ITEMS_PER_PAGE)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          currentPage >= Math.ceil(totalProducts / ITEMS_PER_PAGE)
                            ? "text-neutral-300 cursor-not-allowed"
                            : "text-charcoal hover:bg-blush/10 hover:text-blush"
                        )}
                      >
                        Next →
                      </button>
                    </div>
                    
                    {/* Page Info */}
                    <p className="text-sm text-neutral-400">
                      Page {currentPage} of {Math.ceil(totalProducts / ITEMS_PER_PAGE)}
                    </p>
                  </div>
                )}
              </>
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
                {(search || selectedCategory || hasActiveFilters) && (
                  <button 
                    onClick={clearAllFilters}
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

      {/* 🔹 Recently Viewed Section */}
      {!loading && recentlyViewed.length > 0 && (
        <section className="py-16 bg-cream/30 border-t border-[#F3E8E5]">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="flex items-center gap-3 mb-8">
              <Clock className="w-5 h-5 text-blush" />
              <h2 className="text-2xl font-serif font-bold text-charcoal">
                Recently <span className="text-blush italic">Viewed</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {recentlyViewed.slice(0, 6).map((product) => (
                <a
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-white mb-3">
                    <Image
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="text-sm font-bold text-charcoal truncate group-hover:text-blush transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-sm text-blush font-bold">
                    ₹{product.variants?.[0]?.price || 0}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />

      {/* Quick View Modal */}
      <Dialog open={!!quickViewProduct} onOpenChange={() => setQuickViewProduct(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white rounded-[32px] border-none">
          <DialogTitle className="sr-only">
            {quickViewProduct?.name || 'Product Quick View'}
          </DialogTitle>
          {quickViewProduct && (
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image Section */}
              <div className="relative aspect-square bg-cream/30">
                <Image
                  src={quickViewProduct.images?.[0] || '/placeholder.svg'}
                  alt={quickViewProduct.name}
                  fill
                  className="object-cover"
                />
              </div>
              
              {/* Details Section */}
              <div className="p-8 flex flex-col">
                <div className="flex-1">
                  <h2 className="text-2xl font-serif font-bold text-charcoal mb-2">
                    {quickViewProduct.name}
                  </h2>
                  <p className="text-2xl font-bold text-blush mb-4">
                    ₹{quickViewProduct.variants?.[0]?.price || 0}
                  </p>
                  <p className="text-neutral-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {quickViewProduct.description || 'No description available.'}
                  </p>
                  
                  {/* Size Selection */}
                  {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
                    <div className="mb-6">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 block">
                        Select Size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.variants.map((variant) => (
                          <button
                            key={variant.sku}
                            onClick={() => setSelectedQuickViewSize(variant.options?.Size || variant.sku)}
                            className={cn(
                              "px-4 py-2 text-xs font-bold rounded-lg transition-all border",
                              selectedQuickViewSize === (variant.options?.Size || variant.sku)
                                ? "bg-blush text-white border-blush shadow-md"
                                : "bg-white text-charcoal border-[#F3E8E5] hover:border-blush hover:text-blush"
                            )}
                          >
                            {variant.options?.Size || variant.sku}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-3 mt-auto">
                  <button
                    onClick={() => toggleWishlist(quickViewProduct.id)}
                    className={cn(
                      "px-4 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                      isInWishlist(quickViewProduct.id)
                        ? "bg-blush text-white"
                        : "bg-neutral-100 text-charcoal hover:bg-blush hover:text-white"
                    )}
                    aria-label={isInWishlist(quickViewProduct.id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart className={cn("w-4 h-4", isInWishlist(quickViewProduct.id) && "fill-current")} />
                  </button>
                  <a
                    href={`/products/${quickViewProduct.id}`}
                    className="flex-1 bg-charcoal text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-blush transition-all text-center flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    View Details
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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