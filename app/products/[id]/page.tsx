'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db } from '@/lib/firebase';
import type { Product } from '@/lib/types';
import { doc, getDoc, collection, query, where, limit, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, Heart, Share2, ShieldCheck, Truck, Star, MessageSquare } from 'lucide-react';
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
  const [isFav, setIsFav] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [offerData, setOfferData] = useState<AppliedOffer | null>(null);
  const { addToCart } = useCart();
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  // Fetch offer when product loads or size changes
  useEffect(() => {
    if (product) {
      fetchOfferForVariant();
    }
  }, [product, selectedSize]);

  // Auto-select size if only one variant available
  useEffect(() => {
    if (product) {
      const variants = (product as any).variants as Array<{sku:string;options:Record<string,string>;price:number;stock:number}> | undefined;
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
            const ref = doc(db, "users", user.uid, "favorites", id);
            const snap = await getDoc(ref);
            setIsFav(snap.exists());
        } catch (err) {
            console.error("Error checking fav:", err);
        }
    };
    checkFav();
  }, [user, id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as any as Product;
        setProduct(data);
        if (data.category_slug) {
          fetchRelated(data.category_slug, docSnap.id);
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
      const variants = (product as any).variants as Array<{sku:string;options:Record<string,string>;price:number;stock:number}> | undefined;
      
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
        const ref = doc(db, "users", user.uid, "favorites", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            await deleteDoc(ref);
            setIsFav(false);
            toast.info("Removed from favorites");
        } else {
            // Get price/image from variants array or fallback
            const variants = (product as any).variants as any[] | undefined;
            const price = variants?.[0]?.price ?? 0;
            const image = (product as any).images?.[0] || '/placeholder.svg';

            await setDoc(ref, {
                productId: id,
                name: product.name,
                price: price,
                image: image,
                createdAt: new Date(),
            });
            setIsFav(true);
            toast.success("Added to favorites");
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
        const q = query(
            collection(db, "products"),
            where("category_slug", "==", categorySlug),
            limit(10) // Fetch more to filter out current
        );
        const snapshot = await getDocs(q);
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        const filtered = all.filter(p => p.id !== currentProductId).slice(0, 4);
        setRelatedProducts(filtered);
    } catch (err) {
        console.error("Error fetching related:", err);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!user) {
      toast.info("Please login to add items to cart");
      router.push(`/login?redirect=/products/${id}`);
      return;
    }

    // Check if product has size options
    const variants = (product as any).variants as Array<{sku:string;options:Record<string,string>;price:number;stock:number}> | undefined;
    const hasSizeOption = variants && variants.length > 0;

    // CRITICAL: If product has sizes, require selection
    if (hasSizeOption && !selectedSize) {
      toast.error("Please select a size first");
      return;
    }

    // Find the selected variant
    const variant = hasSizeOption 
      ? variants.find((v: any) => v.sku === selectedSize)
      : null;

    // Validate variant exists
    if (hasSizeOption && !variant) {
      toast.error("Invalid size selection");
      return;
    }

    // Double-check stock availability
    if (variant && variant.stock <= 0) {
      toast.error("Sorry, this size is out of stock");
      return;
    }

    // Add to cart with correct variant data
    addToCart({
      id: product.id,
      name: product.name,
      sku: variant?.sku || "ONE-SIZE",
      selectedSize: variant?.options?.Size || selectedSize || "Free Size",  // Use Size from options, not SKU
      price: variant?.price ?? ((product as any).variants?.[0]?.price || 0),
      image: (product as any).images?.[0] || '/placeholder.svg',
      quantity: 1,
    });

    toast.success("Added to cart!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen flex items-center justify-center bg-white">
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
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 md:px-10 py-12">
        {/* BACK BUTTON */}
        <Link href="/products" className="inline-flex items-center gap-2 text-neutral-400 hover:text-blush font-bold text-xs uppercase tracking-[0.2em] mb-12 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Collection
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-24">
          {/* IMAGE SECTION */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-neutral-100 shadow-xl shadow-rose-100/10">
            {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
            <img
              src={(product as any).images?.[0] || '/placeholder.svg'}
              alt={product.name}
              onLoad={() => setImgLoading(false)}
              onError={(e) => {
                console.log("Image load failed, using placeholder");
                e.currentTarget.src = '/placeholder.svg';
                setImgLoading(false);
              }}
              className={cn(
                "w-full h-full object-cover transition-all duration-700 hover:scale-105",
                imgLoading ? "opacity-0" : "opacity-100"
              )}
            />
          </div>

          {/* CONTENT SECTION */}
          <div className="flex flex-col h-full">
            <nav className="flex mb-4 text-xs text-blush uppercase tracking-[0.2em] font-black">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="mx-2 text-neutral-300">/</span>
              <span className="text-neutral-400 font-medium">{product.name}</span>
            </nav>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-4 tracking-tight leading-[1.1]">
              {product.name}
            </h1>

            <div className="flex items-center gap-5 mb-8">
              {(() => {
                const variants = (product as any).variants as any[] | undefined;
                const v = variants?.find((v: any) => v.sku === selectedSize);
                const basePrice = v?.price ?? variants?.[0]?.price ?? 0;
                
                // Use offer data if available, otherwise show base price
                const displayPrice = offerData?.discountedPrice ?? basePrice;
                const hasDiscount = offerData?.hasOffer && offerData.savings > 0;
                
                return (
                  <>
                    <span className="text-4xl font-serif font-bold text-blush tracking-tight">₹{displayPrice}</span>
                    {hasDiscount && (
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-neutral-300 line-through text-lg font-medium">₹{offerData?.originalPrice}</span>
                        <span className="bg-green-50 text-green-600 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-100 italic">
                          {offerData?.offer?.displayText || `SAVE ₹${offerData?.savings}`}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="mb-10 lg:mb-12">
              <p className="text-lg text-neutral-500 leading-relaxed font-sans max-w-xl">
                {product.description || "Indulge in the finest collection of Miks & Chiks. This piece is crafted with care to ensure the highest quality and comfort for you and your little ones."}
              </p>
            </div>

            {/* SIZE SELECTION — canonical variants[] */}
            {(() => {
                const variants = (product as any).variants as Array<{sku:string;options:Record<string,string>;price:number;stock:number}> | undefined;
                if (!variants || variants.length === 0) return (
                  <p className="text-sm text-neutral-400 mb-6 italic">No sizes available</p>
                );
                return (
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-400">Select Size</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {variants.map(v => {
                                const isOOS = v.stock <= 0;
                                return (
                                <button key={v.sku}
                                    onClick={() => !isOOS && setSelectedSize(v.sku)}
                                    disabled={isOOS}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl border text-xs font-bold transition-all duration-300",
                                        isOOS ? "opacity-40 cursor-not-allowed bg-neutral-100 border-neutral-200 line-through" : "active:scale-95",
                                        selectedSize === v.sku
                                            ? "bg-charcoal border-charcoal text-white shadow-xl shadow-charcoal/20"
                                            : (!isOOS && "bg-white border-[#F3E8E5] text-charcoal hover:border-blush hover:text-blush")
                                    )}>
                                    {v.options?.Size || v.sku} {isOOS && "(Out of Stock)"}
                                </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <div className="mt-auto space-y-8">
              <div className="flex flex-col sm:flex-row gap-4">
                {(() => {
                  const variants = (product as any).variants;
                  const hasVariants = variants && variants.length > 0;
                  const needsSizeSelection = hasVariants && !selectedSize;
                  
                  return (
                    <>
                      <button
                        onClick={handleAddToCart}
                        disabled={!user || needsSizeSelection}
                        className={cn(
                          "flex-1 px-8 py-5 rounded-2xl transition-all shadow-2xl font-bold text-lg active:scale-95 flex items-center justify-center gap-4 group",
                          !user
                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                            : needsSizeSelection
                              ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none" 
                              : "bg-blush text-white hover:bg-[#f48c82] shadow-blush/20"
                        )}
                      >
                        <ShoppingCart className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                        {!user ? "Login Required" : needsSizeSelection ? "Select Size First" : "Add to Cart"}
                      </button>
                      <button 
                        onClick={toggleFavorite}
                        className={cn(
                          "p-5 rounded-2xl border transition-all duration-300 active:scale-90 shadow-sm",
                          isFav 
                            ? "bg-blush border-blush text-white shadow-blush/30" 
                            : "bg-white border-[#F3E8E5] text-neutral-300 hover:text-blush hover:border-blush/30"
                        )}
                      >
                        <Heart className={cn("w-6 h-6", isFav && "fill-current")} />
                      </button>
                      <button 
                        onClick={handleShare}
                        className="p-5 border border-[#F3E8E5] rounded-2xl hover:bg-neutral-50 transition-all text-neutral-300 hover:text-charcoal active:scale-90 shadow-sm"
                      >
                        <Share2 className="w-6 h-6" />
                      </button>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-4">
                <ShieldCheck className="w-6 h-6 text-neutral-400" />
                <p className="text-sm text-neutral-400">100% Secure Payment</p>
              </div>
              <div className="flex items-center gap-4">
                <Truck className="w-6 h-6 text-neutral-400" />
                <p className="text-sm text-neutral-400">Free Shipping on Orders Over ₹1000</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-16 border-t pt-12">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blush" />
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
                className="w-full mb-8 bg-gradient-to-r from-blush to-pink-400 text-white py-4 rounded-2xl font-semibold hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
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

        <Footer />
      </main>
    </div>
  );
}
