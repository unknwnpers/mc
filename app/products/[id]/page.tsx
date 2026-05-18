'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/types';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, Heart, Share2, ShieldCheck, Truck, Star, MessageSquare, Package, RefreshCw, Award, Sparkles, MapPin, Calendar, X, ChevronDown, Ruler, Check, Eye, Flame, Plus, Minus, CheckCircle2, Loader2 } from 'lucide-react';
import { ReviewForm } from '@/components/ReviewForm';
import { ReviewsDisplay } from '@/components/ReviewsDisplay';



interface AppliedOffer {
  hasOffer: boolean;
  offer?: {
    id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    displayText: string;
  };
  originalPrice: number;
  discountedPrice: number;
  savings: number;
}

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [offerData, setOfferData] = useState<AppliedOffer | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['description']);
  const [stats, setStats] = useState({ viewers: 0, inCart: 0 });
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});
  const [showStickyBar, setShowStickyBar] = useState(false);
  // Prevents double-clicks and race conditions on "Add to Cart"
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const { user, profile } = useAuth();
  const router = useRouter();

  // Toggle accordion section
  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  useEffect(() => {
    fetchProduct();
    fetchReviews();

    // Track product view and setup stats polling
    if (id) {
      // Small delay to ensure page is fully loaded
      const viewTimeout = setTimeout(() => {
        trackProductView();
      }, 500);

      fetchProductStats();

      // Poll stats every 15 seconds for more real-time feel
      const statsInterval = setInterval(fetchProductStats, 15000);

      return () => {
        clearTimeout(viewTimeout);
        clearInterval(statsInterval);
      };
    }
  }, [id]);

  // Handle Sticky Bar visibility
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling past the main buy section (approx 800px)
      if (window.scrollY > 800) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track product view
  const trackProductView = async () => {
    try {
      // Get or create session ID
      let sessionId = localStorage.getItem('product_view_session_id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('product_view_session_id', sessionId);
      }

      const response = await fetch(`/api/products/${id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        console.warn('Product view tracking failed:', response.status);
      }
    } catch (error) {
      // Silent fail - don't break UX for analytics
      console.error('Error tracking product view:', error);
    }
  };

  // Fetch product stats (viewers, in-cart count, available stock)
  const fetchProductStats = async () => {
    try {
      const response = await fetch(`/api/products/${id}/stats`);
      const result = await response.json();

      if (result.success && result.stats) {
        setStats({
          viewers: result.stats.viewers || 0,
          inCart: result.stats.inCart || 0,
        });
        setAvailableStock(result.stats.availableStock || {});
      }
    } catch (error) {
      console.error('Error fetching product stats:', error);
    }
  };

  // Fetch offer when product loads or size changes
  useEffect(() => {
    if (product) {
      fetchOfferForVariant();
    }
  }, [product, selectedSize]);

  // Auto-select size if only one variant available
  useEffect(() => {
    if (product) {
      const variants = (product as any).variants as Array<{ sku: string; options: Record<string, string>; price: number; stock: number }> | undefined;
      if (variants && variants.length === 1 && variants[0].stock > 0) {
        // Only one size in stock → auto-select
        setSelectedSize(variants[0].sku);
      }
    }
  }, [product]);

  useEffect(() => {
    const checkFav = async () => {
      if (!user || !id) return;
      try {
        const response = await fetch(`/api/user/favorites/check?productId=${id}`, {
          headers: {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        });
        const data = await response.json();
        setIsFav(data.isFavorite);
      } catch (err) {
        console.error("Error checking fav:", err);
      }
    };
    checkFav();
  }, [user, id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`);
      const result = await response.json();

      if (result.success && result.product) {
        setProduct(result.product);
        if (result.product.category_slug) {
          fetchRelated(result.product.category_slug, result.product.id);
        }
      } else {
        console.log('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`/api/reviews/product?productId=${id}`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchOfferForVariant = async () => {
    if (!product) return;

    try {
      const variants = (product as any).variants as Array<{ sku: string; options: Record<string, string>; price: number; stock: number }> | undefined;

      // Get price from selected variant, or first variant, or 0
      let price = 0;
      if (selectedSize && variants) {
        const variant = variants.find(v => v.sku === selectedSize);
        price = variant?.price ?? 0;
      } else if (variants && variants.length > 0) {
        price = variants[0].price;
      }

      if (price === 0) return;

      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price,
          categorySlug: product.category_slug,
          productId: product.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setOfferData(data);
      }
    } catch (error) {
      console.error('Error fetching offer:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.info("Please login to use favorites");
      return;
    }

    if (!product) {
      toast.error("Product not available");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: id })
      });

      const result = await response.json();

      if (result.success) {
        setIsFav(result.isFavorite);
        toast.success(result.isFavorite ? "Added to favorites" : "Removed from favorites");
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Favorite error:", err);
      toast.error("Failed to update favorites");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product?.name,
        text: "Check out this beautiful item from Miks & Chiks!",
        url: window.location.href,
      });
    } catch (err) {
      console.log("Share cancelled or failed");
    }
  };

  const fetchRelated = async (categorySlug: string, currentProductId: string) => {
    try {
      const response = await fetch(`/api/products?category=${categorySlug}&limit=10`);
      const result = await response.json();

      if (result.success && Array.isArray(result.products)) {
        const all = result.products as Product[];
        const filtered = all.filter((p: Product) => p.id !== currentProductId).slice(0, 4);
        setRelatedProducts(filtered);
      }
    } catch (err) {
      console.error("Error fetching related:", err);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // GUARD: Prevent double-clicks and concurrent submissions
    if (isAddingToCart) return;

    if (!user) {
      toast.info("Please login to add items to cart");
      router.push(`/login?redirect=/products/${id}`);
      return;
    }

    const variants = (product as any).variants as Array<{ sku: string; options: Record<string, string>; price: number; stock: number }> | undefined;
    const hasSizeOption = variants && variants.length > 0;

    if (hasSizeOption && !selectedSize) {
      toast.error("Please select a size first");
      return;
    }

    const variant = hasSizeOption
      ? variants.find((v: any) => v.sku === selectedSize)
      : null;

    if (hasSizeOption && !variant) {
      toast.error("Invalid size selection");
      return;
    }

    // Use real-time stock from stats API, fall back to variant stock
    const raw_stock = availableStock[variant?.sku ?? ''] ?? (variant?.stock ?? 0);
    const reserve = Math.ceil(0.2 * raw_stock);
    const sellable_stock = Math.max(0, raw_stock - reserve);
    const max_per_customer = Math.min(10, sellable_stock);

    if (variant && max_per_customer <= 0) {
      toast.error("Sorry, this size is currently out of stock");
      return;
    }

    const finalQty = Math.min(quantity, Math.max(1, max_per_customer));

    setIsAddingToCart(true);
    try {
      // await so errors from Firestore surface correctly
      // cart-context already shows its own success toast — no duplicate here
      await addToCart({
        id: product.id,
        name: product.name,
        sku: variant?.sku || "ONE-SIZE",
        selectedSize: variant?.options?.Size || selectedSize || "Free Size",
        price: offerData?.hasOffer ? offerData.discountedPrice : (variant?.price ?? ((product as any).variants?.[0]?.price || 0)),
        mrp: variant?.price ?? ((product as any).variants?.[0]?.price || 0),
        image: (product as any).images?.[0] || '/placeholder.svg',
        quantity: finalQty,
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--mc-bg-base)' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-12 w-full max-w-xs rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--mc-bg-base)' }}>
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold mb-4 text-neutral-900">Product not found</h1>
        <p className="text-neutral-500 mb-8">The product you are looking for doesn't exist or has been removed.</p>
        <Link href="/" className="inline-block bg-rose-400 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-100">
          Back to Shop
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--mc-bg-base)' }}>
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        {/* BACK BUTTON */}
        <Link href="/products" className="inline-flex items-center gap-2 text-neutral-400 hover:text-[#C8B273] font-bold text-xs uppercase tracking-[0.2em] mb-12 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Collection
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-24">
          {/* IMAGE SECTION */}
          <div className="space-y-3">
            {/* Main Image - Reduced height with better hover effect */}
            <div
              className="relative aspect-[4/5] max-h-[500px] rounded-3xl overflow-hidden bg-neutral-100 shadow-xl shadow-rose-100/10 group cursor-zoom-in"
              onClick={() => setShowLightbox(true)}
            >
              {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
              <img
                src={(product as any).images?.[selectedImageIndex] || '/placeholder.svg'}
                alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                onLoad={() => setImgLoading(false)}
                onError={(e) => {
                  console.log("Image load failed, using placeholder");
                  e.currentTarget.src = '/placeholder.svg';
                  setImgLoading(false);
                }}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110",
                  imgLoading ? "opacity-0" : "opacity-100"
                )}
              />
              {/* Hover Overlay with Zoom Icon */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              {/* Image Counter */}
              {((product as any).images?.length || 0) > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  {selectedImageIndex + 1} / {(product as any).images?.length}
                </div>
              )}
              {/* Navigation Arrows */}
              {((product as any).images?.length || 0) > 1 && (
                <>
                  <button
                    onClick={() => {
                      const total = (product as any).images?.length || 1;
                      setSelectedImageIndex((prev) => (prev - 1 + total) % total);
                      setImgLoading(true);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-neutral-700 p-2 rounded-full shadow-lg transition-all"
                    aria-label="Previous image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => {
                      const total = (product as any).images?.length || 1;
                      setSelectedImageIndex((prev) => (prev + 1) % total);
                      setImgLoading(true);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-neutral-700 p-2 rounded-full shadow-lg transition-all"
                    aria-label="Next image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </>
              )}
            </div>
            {/* Thumbnail Strip - Improved visibility */}
            {((product as any).images?.length || 0) > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                {((product as any).images || []).map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedImageIndex(idx); setImgLoading(true); }}
                    className={cn(
                      "relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all hover:shadow-md",
                      selectedImageIndex === idx
                        ? "border-[#C8B273] shadow-md shadow-rose-200 ring-2 ring-[#C8B273]/20"
                        : "border-neutral-200 hover:border-[#C8B273]/50"
                    )}
                  >
                    <img
                      src={img}
                      alt={`${product.name} thumbnail ${idx + 1}`}
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CONTENT SECTION */}
          <div className="flex flex-col h-full">
            <nav className="flex mb-4 text-xs text-[#C8B273] uppercase tracking-[0.2em] font-black">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="mx-2 text-neutral-300">/</span>
              {product.category_slug ? (
                <>
                  <Link href={`/products?category=${product.category_slug}`} className="hover:underline">
                    {product.category_slug.replace(/-/g, ' ')}
                  </Link>
                  <span className="mx-2 text-neutral-300">/</span>
                </>
              ) : null}
              <span className="text-neutral-400 font-medium truncate max-w-[200px]">{product.name}</span>
            </nav>

            {/* Product Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {product.is_featured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold uppercase tracking-wider rounded-full border border-amber-100">
                  <Flame className="w-3 h-3" /> Bestseller
                </span>
              )}
              {product.createdAt && (() => {
                const created = new Date(product.createdAt.seconds * 1000);
                const daysSince = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince <= 30) {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider rounded-full border border-green-100">
                      <Sparkles className="w-3 h-3" /> New Arrival
                    </span>
                  );
                }
                return null;
              })()}
              {(() => {
                const variants = (product as any).variants as any[] | undefined;
                const totalStock = variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                if (totalStock > 0 && totalStock <= 5) {
                  return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-full border border-red-100">
                      <Eye className="w-3 h-3" /> Only {totalStock} Left
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-[#3B312C] mb-4 tracking-tight leading-[1.05]">
              {product.name}
            </h1>

            {/* Price Display - Fixed */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              {(() => {
                const variants = (product as any).variants as any[] | undefined;
                const v = variants?.find((v: any) => v.sku === selectedSize);
                const basePrice = v?.price ?? variants?.[0]?.price ?? 0;

                // Use offer data if available, otherwise show base price
                const displayPrice = offerData?.discountedPrice ?? basePrice;
                const hasDiscount = offerData?.hasOffer && offerData.savings > 0;

                return (
                  <>
                    <span className="text-3xl md:text-4xl font-serif font-bold text-[#C8B273] tracking-tight whitespace-nowrap">
                      ₹{displayPrice.toLocaleString('en-IN')}
                    </span>
                    {hasDiscount && (
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 line-through text-lg font-medium">
                          ₹{offerData?.originalPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="bg-green-50 text-green-600 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-green-100">
                          {offerData?.offer?.displayText || `Save ₹${offerData?.savings.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Social Proof - Real-time Stats */}
            <div className="flex items-center gap-6 mb-8 text-sm">
              <span className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100/50" title="Active viewers in the last 5 minutes">
                <Eye className="w-4 h-4 animate-pulse" />
                {stats.viewers} people viewing
              </span>
              <span className="flex items-center gap-2 text-[#C8B273] font-bold bg-[#F8F4EE] px-3 py-1.5 rounded-full border border-[#C8B273]/10" title="Users with this product in their cart">
                <ShoppingCart className="w-4 h-4" />
                {stats.inCart} in carts
              </span>
            </div>

            {/* Product Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              {[
                { icon: Check, title: "Premium Fabric", desc: "100% Breathable" },
                { icon: ShieldCheck, title: "Safe for Baby", desc: "Eco-friendly dyes" },
                { icon: Truck, title: "Quick Shipping", desc: "Dispatch in 24h" },
              ].map((highlight, idx) => (
                <div key={idx} className="flex flex-col items-center text-center p-4 bg-[#FCF9F7] rounded-2xl border border-[#C8B273]/5 group hover:border-[#C8B273]/20 transition-all">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                    <highlight.icon className="w-5 h-5 text-[#C8B273]" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#3B312C] mb-0.5">{highlight.title}</p>
                  <p className="text-[10px] text-neutral-400 font-medium">{highlight.desc}</p>
                </div>
              ))}
            </div>

            {/* ACCORDION SECTIONS */}
            <div className="mb-10 space-y-3">
              {/* Description Accordion */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection('description')}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#C8B273]" />
                    Description
                  </span>
                  {openSections.includes('description') ? (
                    <Minus className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
                {openSections.includes('description') && (
                  <div className="p-4 pt-0 bg-white">
                    <p className="text-neutral-600 leading-relaxed">
                      {product.description || "Indulge in the finest collection of Miks & Chiks. This piece is crafted with care to ensure the highest quality and comfort for you and your little ones."}
                    </p>
                  </div>
                )}
              </div>

              {/* Material & Care Accordion */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection('material')}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C8B273]" />
                    Material & Care
                  </span>
                  {openSections.includes('material') ? (
                    <Minus className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
                {openSections.includes('material') && (
                  <div className="p-4 pt-0 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[#C8B273]">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-700">Material</p>
                          <p className="text-sm text-neutral-500">Premium soft cotton blend</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[#C8B273]">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-700">Care</p>
                          <p className="text-sm text-neutral-500">Machine wash cold, gentle cycle</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping & Replacement Accordion */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleSection('shipping')}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors"
                >
                  <span className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#C8B273]" />
                    Shipping & Replacement
                  </span>
                  {openSections.includes('shipping') ? (
                    <Minus className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <Plus className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
                {openSections.includes('shipping') && (
                  <div className="p-4 pt-0 bg-white space-y-3">
                    <div className="flex items-start gap-3">
                      <Truck className="w-4 h-4 text-[#C8B273] mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-700">Delivery</p>
                        <p className="text-sm text-neutral-500">Free shipping on orders over ₹1000. Delivery in 10 business days.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-4 h-4 text-[#C8B273] mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-neutral-700">Replacement</p>
                        <p className="text-sm text-neutral-500">Easy 48 hours replacement. Product must be unworn with tags attached.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SIZE SELECTION — canonical variants[] */}
            {(() => {
              const variants = (product as any).variants as Array<{ sku: string; options: Record<string, string>; price: number; stock: number }> | undefined;
              if (!variants || variants.length === 0) return (
                <p className="text-sm text-neutral-400 mb-6 italic">No sizes available</p>
              );
              const selectedVariant = variants.find(v => v.sku === selectedSize);
              return (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-400">Select Size</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toast.info("Size guide coming soon!")}
                        className="text-xs font-bold text-[#C8B273] hover:text-[#C8B273]/80 flex items-center gap-1 transition-colors"
                      >
                        <Ruler className="w-3 h-3" />
                        Size Guide
                      </button>
                      {selectedVariant && (() => {
                        // Use real-time availableStock from stats API as source of truth
                        const realStock = availableStock[selectedVariant.sku] ?? selectedVariant.stock;
                        const reserve = Math.ceil(0.2 * realStock);
                        const sellable = Math.max(0, realStock - reserve);
                        const allowedQty = Math.min(2, Math.floor(sellable / 3));
                        const isOOS = allowedQty <= 0;
                        const isLow = !isOOS && sellable <= 3;
                        return (
                          <span className={cn(
                            "text-xs font-bold",
                            isOOS ? "text-red-500" : isLow ? "text-orange-500" : "text-green-600"
                          )}>
                            {isOOS ? "Out of Stock" : isLow ? `Only ${sellable} left` : "In Stock"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {variants.map(v => {
                      // Use real-time stock for each variant button
                      const realStock = availableStock[v.sku] ?? v.stock;
                      const reserve = Math.ceil(0.2 * realStock);
                      const sellable = Math.max(0, realStock - reserve);
                      const allowedQty = Math.min(2, Math.floor(sellable / 3));
                      const isOOS = allowedQty <= 0;
                      const isLowStock = !isOOS && sellable <= 3;
                      return (
                        <button key={v.sku}
                          onClick={() => !isOOS && setSelectedSize(v.sku)}
                          disabled={isOOS}
                          className={cn(
                            "relative px-6 py-3 rounded-2xl border text-xs font-bold transition-all duration-300",
                            isOOS ? "opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200 line-through" : "active:scale-95",
                            selectedSize === v.sku
                              ? "bg-[#3B312C] border-[#3B312C] text-white shadow-xl shadow-[#3B312C]/20"
                              : (!isOOS && "bg-white border-[#F3E8E5] text-[#3B312C] hover:border-[#C8B273] hover:text-[#C8B273]"),
                            isLowStock && selectedSize !== v.sku && "border-orange-200 text-orange-600"
                          )}>
                          {v.options?.Size || v.sku}
                          {isOOS && <span className="block text-[9px] font-normal mt-0.5">Out of Stock</span>}
                          {isLowStock && !isOOS && <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" title="Low stock" />}
                        </button>
                      );
                    })}
                  </div>
                  {/* SKU Display */}
                  {selectedVariant && (
                    <p className="mt-3 text-xs text-neutral-400 font-mono">
                      SKU: <span className="text-neutral-600">{selectedVariant.sku}</span>
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="mt-auto space-y-6">
              {/* Quantity Selector with Available Stock */}
              {(() => {
                const variants = (product as any).variants;
                const hasVariants = variants && variants.length > 0;
                const selectedVariant = hasVariants ? variants.find((v: any) => v.sku === selectedSize) : null;

                // Use real-time availableStock from stats API as source of truth
                const realStock = selectedVariant ? (availableStock[selectedVariant.sku] ?? selectedVariant.stock) : 0;
                // Backend Purchase Logic:
                // Step 1 — Reserve 20% buffer for operational purposes
                const reserve = Math.ceil(0.2 * realStock);
                // Step 2 — Sellable stock is what can actually be sold
                const sellable_stock = Math.max(0, realStock - reserve);
                // Step 3 — Max per customer = sellable stock, capped at 10
                const max_per_customer = Math.min(10, sellable_stock);

                const maxQty = max_per_customer;

                const isOutOfStock = maxQty <= 0;
                const isLowStock = maxQty > 0 && maxQty <= 3;

                const currentQty = Math.min(quantity, Math.max(1, maxQty));

                return (
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Quantity</span>
                    <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, currentQty - 1))}
                        disabled={currentQty <= 1 || isOutOfStock}
                        className="px-4 py-2 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className={`px-4 py-2 font-bold min-w-[3rem] text-center ${isOutOfStock ? 'text-neutral-400' : 'text-neutral-700'}`}>
                        {isOutOfStock ? 0 : currentQty}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(maxQty, currentQty + 1))}
                        disabled={currentQty >= maxQty || isOutOfStock}
                        className="px-4 py-2 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stock Status — shows max units customer can purchase */}
                    {selectedSize && (
                      <span className={`text-xs font-medium ${isOutOfStock
                        ? 'text-red-500'
                        : isLowStock
                          ? 'text-amber-600'
                          : 'text-green-600'
                        }`}>
                        {isOutOfStock
                          ? 'Out of Stock'
                          : isLowStock
                            ? `Only ${maxQty} left!`
                            : `${maxQty} available`
                        }
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-4">
                {(() => {
                  const variants = (product as any).variants;
                  const hasVariants = variants && variants.length > 0;
                  const needsSizeSelection = hasVariants && !selectedSize;
                  // Use real-time availableStock from stats API
                  const raw_total_stock = selectedSize ? (availableStock[selectedSize] ?? (variants?.find((v: any) => v.sku === selectedSize)?.stock ?? 0)) : 0;
                  const reserve = Math.ceil(0.2 * raw_total_stock);
                  const sellable_stock = Math.max(0, raw_total_stock - reserve);
                  // Max per customer = sellable stock, capped at 10
                  const max_per_customer = Math.min(10, sellable_stock);

                  const isOutOfStock = selectedSize && max_per_customer <= 0;
                  const currentQty = Math.min(quantity, Math.max(1, max_per_customer));

                  return (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={needsSizeSelection || !!isOutOfStock || isAddingToCart}
                        className={cn(
                          "flex-1 px-8 py-5 rounded-2xl transition-all shadow-xl font-bold text-lg active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden",
                          needsSizeSelection
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                            : isOutOfStock
                              ? "bg-red-50 text-red-400 cursor-not-allowed shadow-none border-2 border-red-100"
                              : isAddingToCart
                                ? "bg-gradient-to-r from-[#C8B273] to-[#B89B5E] text-white opacity-80 cursor-wait"
                                : "bg-gradient-to-r from-[#C8B273] to-[#B89B5E] text-white hover:shadow-2xl hover:shadow-[#C8B273]/30"
                        )}
                      >
                        {!isOutOfStock && !isAddingToCart && <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
                        {isAddingToCart ? (
                          <svg className="w-5 h-5 animate-spin relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <ShoppingCart className={cn("w-6 h-6 relative z-10 transition-transform", !isOutOfStock && "group-hover:scale-110")} />
                        )}
                        <span className="relative z-10">
                          {isAddingToCart ? "Adding..." : needsSizeSelection ? "Select Size First" : isOutOfStock ? "Out of Stock" : !user ? "Login to Add to Cart" : `Add ${currentQty} to Cart`}
                        </span>
                      </button>
                      <button
                        onClick={toggleFavorite}
                        className={cn(
                          "p-5 rounded-2xl border-2 transition-all duration-300 active:scale-90 shadow-sm",
                          isFav
                            ? "bg-[#C8B273] border-[#C8B273] text-white shadow-[#C8B273]/30"
                            : "bg-white border-neutral-200 text-neutral-400 hover:text-[#C8B273] hover:border-[#C8B273]"
                        )}
                      >
                        <Heart className={cn("w-6 h-6", isFav && "fill-current")} />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-5 border-2 border-neutral-200 rounded-2xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-neutral-400 hover:text-[#3B312C] active:scale-90 shadow-sm"
                      >
                        <Share2 className="w-6 h-6" />
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* DELIVERY ESTIMATE */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <p className="text-sm font-bold text-blue-800">Delivery Estimate</p>
                </div>
                <p className="text-sm text-blue-600 pl-8">
                  Usually ships within 1-2 business days.
                  <span className="font-medium">Delivery in 3-5 days</span> for metro cities.
                </p>
              </div>

              {/* THE MIKS & CHIKS PROMISE */}
              <div className="mt-12 p-8 bg-gradient-to-br from-[#F8F4EE] to-[#FCF9F7] rounded-[32px] border border-[#C8B273]/10 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-serif font-bold text-[#3B312C] mb-6 flex items-center gap-3">
                    <Award className="w-6 h-6 text-[#C8B273]" />
                    The Miks & Chiks <span className="text-[#C8B273] italic">Promise</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-bold text-[#3B312C]">Quality First</p>
                          <p className="text-xs text-neutral-500">Every piece is hand-checked for softness and durability.</p>
                        </div>
                      </div>

                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-1" />
                        <div>
                          <p className="text-sm font-bold text-[#3B312C]">Safe Checkout</p>
                          <p className="text-xs text-neutral-500">Secure payments via Razorpay with all major cards.</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8B273]/5 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section - Full Width Outside Grid */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 mt-16 mb-20">
          <div className="border-t border-neutral-200 pt-12">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-[#C8B273]" />
                <h2 className="text-3xl font-bold text-gray-900">Customer Reviews</h2>
              </div>
              {averageRating > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-3 rounded-xl">
                  <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-600">({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            {/* Write Review Button */}
            {user ? (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="w-full mb-8 bg-gradient-to-r from-[#C8B273] to-[#B89B5E] text-white py-4 rounded-2xl font-semibold hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Star className="w-5 h-5" />
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </button>
            ) : (
              <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
                <p className="text-blue-800 font-medium">
                  Want to write a review?{' '}
                  <button onClick={() => router.push(`/login?redirect=/products/${id}`)} className="underline font-bold hover:text-blue-600">
                    Login now
                  </button>
                </p>
              </div>
            )}

            {/* Review Form */}
            {showReviewForm && user && (
              <div className="mb-12">
                <ReviewForm
                  productId={id}
                  onSuccess={() => {
                    setShowReviewForm(false);
                    fetchReviews();
                  }}
                />
              </div>
            )}

            {/* Reviews Display */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="w-full h-40 rounded-xl" />
                ))}
              </div>
            ) : (
              <ReviewsDisplay
                reviews={reviews}
                averageRating={averageRating}
                productId={id}
                canModerate={profile?.role === 'admin' || profile?.role === 'superadmin'}
                onReviewDeleted={fetchReviews}
              />
            )}
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
          <h2 className="text-2xl font-bold mb-8">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {/* LIGHTBOX MODAL */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={(product as any).images?.[selectedImageIndex] || '/placeholder.svg'}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Lightbox Navigation */}
            {((product as any).images?.length || 0) > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const total = (product as any).images?.length || 1;
                    setSelectedImageIndex((prev) => (prev - 1 + total) % total);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const total = (product as any).images?.length || 1;
                    setSelectedImageIndex((prev) => (prev + 1) % total);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold">
                  {selectedImageIndex + 1} / {(product as any).images?.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STICKY MOBILE ADD TO CART BAR */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-[40] bg-white border-t border-neutral-100 p-4 transform transition-transform duration-500 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:hidden",
        showStickyBar ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Price</span>
            <span className="text-xl font-serif font-bold text-[#C8B273]">
              ₹{(offerData?.discountedPrice ?? (product as any).variants?.[0]?.price ?? 0).toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isAddingToCart}
            className="flex-1 bg-[#3B312C] text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-[#3B312C]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {isAddingToCart ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
