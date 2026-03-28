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
import { ArrowLeft, ShoppingCart, Heart, Share2, ShieldCheck, Truck, Star } from 'lucide-react';

const SIZE_MAP: any = {
    baby: ["0-3M", "3-6M", "6-9M", "9-12M", "12-18M", "18-24M"],
    kids: ["2Y", "3Y", "4Y", "5Y", "6Y", "8Y", "10Y", "12Y"],
    maternity: ["S", "M", "L", "XL", "XXL", "XXXL"],
    feeding: ["S", "M", "L", "XL", "XXL", "XXXL"],
};

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, [id]);

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
        const data = {
          id: docSnap.id,
          ...docSnap.data(),
        } as Product;
        setProduct(data);
        fetchRelated(data.category_slug, docSnap.id);
      } else {
        console.log('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user) {
        toast.info("Please login to use favorites");
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
            await setDoc(ref, {
                productId: id,
                name: product!.name,
                price: product!.price,
                image: product!.image_url || product!.image || '/placeholder.jpg',
                createdAt: new Date(),
            });
            setIsFav(true);
            toast.success("Added to favorites");
        }
    } catch (err) {
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
        <Link href="/products" className="inline-flex items-center gap-2 text-neutral-400 hover:text-blush font-bold text-[10px] uppercase tracking-[0.2em] mb-12 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Collection
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start mb-24">
          {/* IMAGE SECTION */}
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-neutral-100 shadow-xl shadow-rose-100/10">
            {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
            <img
              src={product.image_url || product.image || '/placeholder.jpg'}
              alt={product.name}
              onLoad={() => setImgLoading(false)}
              className={cn(
                "w-full h-full object-cover transition-all duration-700 hover:scale-105",
                imgLoading ? "opacity-0" : "opacity-100"
              )}
            />
          </div>

          {/* CONTENT SECTION */}
          <div className="flex flex-col h-full">
            <nav className="flex mb-4 text-[10px] text-blush uppercase tracking-[0.2em] font-black">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="mx-2 text-neutral-300">/</span>
              <span className="text-neutral-400 font-medium">{product.name}</span>
            </nav>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-4 tracking-tight leading-[1.1]">
              {product.name}
            </h1>

            <div className="flex items-center gap-5 mb-8">
              <span className="text-4xl font-serif font-bold text-blush tracking-tight">
                ₹{product.price}
              </span>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-neutral-300 line-through text-lg font-medium">
                    ₹{Math.round(product.price * 1.2)}
                </span>
                <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-green-100 italic">
                    SAVE 20%
                </span>
              </div>
            </div>

            <div className="mb-10 lg:mb-12">
              <p className="text-lg text-neutral-500 leading-relaxed font-sans max-w-xl">
                {product.description || "Indulge in the finest collection of Miks & Chiks. This piece is crafted with care to ensure the highest quality and comfort for you and your little ones."}
              </p>
            </div>

            {/* SIZE SELECTION */}
            {(() => {
                const sizes = SIZE_MAP[product.category_slug] || [];
                if (sizes.length === 0) return null;

                return (
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-400">Select Size</p>
                            <button className="text-[10px] font-bold uppercase tracking-widest text-blush hover:underline">Size Guide</button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {sizes.map((size: string) => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl border text-xs font-bold transition-all duration-300 active:scale-95",
                                        selectedSize === size
                                            ? "bg-charcoal border-charcoal text-white shadow-xl shadow-charcoal/20"
                                            : "bg-white border-[#F3E8E5] text-charcoal hover:border-blush hover:text-blush"
                                    )}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-3 font-medium">Not sure? Our sizing is standard for the {product.category_slug} category.</p>
                    </div>
                );
            })()}

            <div className="mt-auto space-y-8">
              <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        if (product) {
                            if (!user) {
                                toast.info("Please login to add items to cart");
                                router.push("/login");
                                return;
                            }

                            const sizes = SIZE_MAP[product.category_slug] || [];
                            if (sizes.length > 0 && !selectedSize) {
                                toast.error("Please select a size first");
                                return;
                            }

                            addToCart({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                image: product.image_url || product.image || '/placeholder.jpg',
                                quantity: 1,
                                selectedSize: selectedSize || undefined
                            });
                        }
                    }}
                    className="flex-1 bg-blush text-white px-8 py-5 rounded-2xl hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/20 font-bold text-lg active:scale-95 flex items-center justify-center gap-4 group"
                >
                    <ShoppingCart className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    Add to Cart
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
              </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex items-center gap-5 p-6 bg-cream/30 rounded-3xl border border-blush/10">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blush border border-blush/5">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em] mb-1">Free Delivery</p>
                    <p className="text-[11px] font-medium text-neutral-500 font-sans">Across Kerala on orders over ₹999</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 p-6 bg-cream/30 rounded-3xl border border-blush/10">
                  <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blush border border-blush/5">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                   <div>
                    <p className="text-[10px] font-black text-charcoal uppercase tracking-[0.2em] mb-1">Quality First</p>
                    <p className="text-[11px] font-medium text-neutral-500 font-sans">Pure cotton & eco-friendly dyes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
            <section className="pt-24 border-t border-[#F3E8E5]">
                <div className="flex items-center justify-between mb-16">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight">You May <span className="text-blush italic">Also Like</span></h2>
                        <p className="text-neutral-500 font-sans mt-2">Perfect matches for this collection</p>
                    </div>
                    <Link href="/products" className="text-blush font-black text-[10px] uppercase tracking-[0.2em] hover:text-charcoal transition-colors">View All Collection</Link>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {relatedProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            </section>
        )}
      </main>

      <Footer />
    </div>
  );
}