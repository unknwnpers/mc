"use client";

import { memo, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2, Tag, Heart, ShoppingBag, Star } from 'lucide-react';

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

function getThumbnailUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl === '/placeholder.svg') {
    return '/placeholder.svg';
  }
  return originalUrl;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [imgLoading, setImgLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [offerData, setOfferData] = useState<AppliedOffer | null>(null);

  const originalImage = product.images?.[0] || '/placeholder.svg';
  const displayImage = getThumbnailUrl(originalImage);
  const displayPrice = product.variants?.[0]?.price ?? 0;
  const displayStock = product.variants?.[0]?.stock ?? 0;

  useEffect(() => {
    if (displayPrice > 0 && product.id) {
      fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: displayPrice,
          categorySlug: product.category_slug,
          productId: product.id
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.hasOffer) {
          setOfferData(data);
        }
      })
      .catch(console.error);
    }
  }, [displayPrice, product.category_slug, product.id]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please login to add items to cart");
      router.push(`/login?redirect=/products/${product.id}`);
      return;
    }

    const variants = product.variants;
    const hasVariants = variants && variants.length > 0;

    if (hasVariants && variants.length > 1) {
      router.push(`/products/${product.id}`);
      return;
    }

    setIsAdding(true);
    try {
      if (hasVariants && variants.length === 1) {
        const variant = variants[0];
        if (variant.stock <= 0) {
          toast.error("Out of stock");
          return;
        }

        await addToCart({
          id: product.id,
          name: product.name,
          price: offerData?.hasOffer ? offerData.discountedPrice : variant.price,
          image: displayImage,
          quantity: 1,
          stock: variant.stock,
          sku: variant.sku,
          selectedSize: variant.options?.Size || variant.sku,
        });
        toast.success("Added to cart!");
        return;
      }

      await addToCart({
        id: product.id,
        name: product.name,
        price: offerData?.hasOffer ? offerData.discountedPrice : displayPrice,
        image: displayImage,
        quantity: 1,
        stock: displayStock,
        sku: product.id,
        selectedSize: "Free Size"
      });
      toast.success("Added to cart!");
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group bg-white rounded-[40px] overflow-hidden border border-[#F3E8E5] hover:shadow-2xl hover:shadow-rose-100/30 transition-all duration-700 flex flex-col h-full relative hover:-translate-y-2">
      {/* Wishlist Button */}
      <button
        onClick={(e) => { e.preventDefault(); setIsFav(!isFav); }}
        className={cn(
          "absolute top-6 right-6 z-20 p-3 rounded-2xl backdrop-blur-md border transition-all active:scale-90",
          isFav ? "bg-blush border-blush text-white" : "bg-white/80 border-white/50 text-neutral-400 hover:text-blush"
        )}
      >
        <Heart className={cn("w-5 h-5", isFav && "fill-current")} />
      </button>

      {/* Image Section */}
      <Link href={`/products/${product.id}`} className="relative overflow-hidden aspect-[4/5] block bg-cream/30">
        {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
        <Image
          src={displayImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          onLoad={() => setImgLoading(false)}
          className={cn(
            "object-cover transition-transform duration-[2s] ease-out group-hover:scale-110",
            imgLoading ? "opacity-0" : "opacity-100",
            displayStock <= 0 && "grayscale opacity-50"
          )}
        />

        {displayStock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
            <span className="bg-white/90 text-charcoal text-[10px] uppercase font-black px-4 py-2 rounded-xl tracking-[0.2em] shadow-xl">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Add Overlay */}
        <div className="absolute bottom-6 left-6 right-6 translate-y-20 group-hover:translate-y-0 transition-transform duration-500 z-20 hidden md:block">
           <button
             onClick={handleAddToCart}
             disabled={displayStock <= 0 || isAdding}
             className="w-full bg-white/95 backdrop-blur-xl py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-charcoal hover:bg-blush hover:text-white transition-all shadow-2xl shadow-black/10 flex items-center justify-center gap-3"
           >
             {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
             Quick Add
           </button>
        </div>
      </Link>

      {/* Info Section */}
      <div className="p-8 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
           <p className="text-[10px] text-neutral-400 uppercase tracking-[0.2em] font-black">
              {product.category_slug || "Premium Collection"}
           </p>
           <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-current" />
              <span className="text-[10px] font-black text-charcoal">4.8</span>
           </div>
        </div>

        <Link href={`/products/${product.id}`} className="block group/title mb-4">
          <h3 className="font-serif font-bold text-charcoal text-2xl line-clamp-1 group-hover/title:text-blush transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-end justify-between mt-auto pt-4 border-t border-[#F3E8E5]">
          <div className="flex flex-col gap-1">
            {offerData?.hasOffer ? (
              <>
                <div className="flex items-center gap-2">
                   <span className="font-serif font-bold text-blush text-3xl tracking-tighter">
                    ₹{offerData.discountedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-neutral-300 line-through text-sm font-medium mb-1">
                    ₹{displayPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100 w-fit uppercase tracking-widest">
                  {offerData.offer?.displayText || `Save ₹${offerData.savings}`}
                </span>
              </>
            ) : (
              <span className="font-serif font-bold text-blush text-3xl tracking-tighter">
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={displayStock <= 0 || isAdding}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-blush/10 md:hidden lg:flex",
              displayStock <= 0 
                ? "bg-neutral-100 text-neutral-300"
                : isAdding
                  ? "bg-blush/80 text-white"
                  : "bg-blush text-white hover:bg-[#f48c82]"
            )}
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
