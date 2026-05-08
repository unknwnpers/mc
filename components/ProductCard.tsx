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
import { Loader2, Heart, ShoppingBag, Star } from 'lucide-react';

interface AppliedOffer {
  hasOffer: boolean;
  offer?: { id: string; name: string; type: 'percentage' | 'fixed'; value: number; displayText: string; };
  originalPrice: number;
  discountedPrice: number;
  savings: number;
}

const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [imgLoading, setImgLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [offerData, setOfferData] = useState<AppliedOffer | null>(null);

  const displayImage = product.images?.[0] || '/placeholder.svg';
  const displayPrice = product.variants?.[0]?.price ?? 0;
  const displayStock = product.variants?.[0]?.stock ?? 0;

  useEffect(() => {
    if (displayPrice > 0 && product.id) {
      fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: displayPrice, categorySlug: product.category_slug, productId: product.id })
      })
      .then(r => r.json())
      .then(d => { if (d.success && d.hasOffer) setOfferData(d); })
      .catch(console.error);
    }
  }, [displayPrice, product.category_slug, product.id]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) { toast.info("Please login to add items"); router.push(`/login?redirect=/products/${product.id}`); return; }
    const variants = product.variants;
    if (variants && variants.length > 1) { router.push(`/products/${product.id}`); return; }
    setIsAdding(true);
    try {
      const variant = variants?.[0];
      if (variant && variant.stock <= 0) { toast.error("Out of stock"); return; }
      await addToCart({
        id: product.id, name: product.name,
        price: offerData?.hasOffer ? offerData.discountedPrice : (variant?.price ?? displayPrice),
        image: displayImage, quantity: 1, stock: variant?.stock ?? displayStock,
        sku: variant?.sku ?? product.id, selectedSize: variant?.options?.Size || variant?.sku || "Free Size",
      });
      toast.success("Added to cart!");
    } catch { toast.error("Failed to add to cart"); }
    finally { setIsAdding(false); }
  };

  const discountPercent = offerData?.hasOffer && displayPrice > 0
    ? Math.round(((displayPrice - offerData.discountedPrice) / displayPrice) * 100) : null;

  return (
    <div
      className="group min-w-0 w-full bg-white rounded-[28px] overflow-hidden border border-[rgba(233,137,126,0.08)] flex flex-col h-full relative transition-all duration-200 md:duration-300 ease-out hover:-translate-y-1.5"
      style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.05)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 56px rgba(233,137,126,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.05)'; }}
    >
      {/* ── WISHLIST BUTTON (top-right, 44px) ── */}
      <button
        onClick={(e) => { e.preventDefault(); setIsFav(!isFav); }}
        className={cn(
          "absolute top-4 right-4 z-20 w-[44px] h-[44px] rounded-full flex items-center justify-center border transition-all duration-300 active:scale-90",
          isFav
            ? "bg-[#E9897E] border-[#E9897E] text-white"
            : "bg-white/70 backdrop-blur-md border-white/50 text-[#8A8A8A] hover:text-[#E9897E] hover:border-[rgba(233,137,126,0.2)]"
        )}
      >
        <Heart className={cn("w-[18px] h-[18px]", isFav && "fill-current")} />
      </button>

      {/* ── DISCOUNT BADGE (top-left) ── */}
      {discountPercent && discountPercent > 0 && (
        <div className="absolute top-4 left-4 z-20 bg-[#E9897E] text-white text-[12px] font-bold px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(233,137,126,0.3)]">
          {discountPercent}% OFF
        </div>
      )}

      {/* ── IMAGE (4:5 aspect) ── */}
      <Link href={`/products/${product.id}`} className="relative overflow-hidden aspect-[4/5] block bg-[#F8F1EC]">
        {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
        <Image
          src={displayImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, 25vw"
          loading="lazy"
          onLoad={() => setImgLoading(false)}
          className={cn(
            "object-cover transition-transform duration-500 ease-out group-hover:scale-105",
            imgLoading ? "opacity-0" : "opacity-100",
            displayStock <= 0 && "grayscale opacity-50"
          )}
        />
        {displayStock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
            <span className="bg-white/95 text-[#1E1E1E] text-[12px] uppercase font-bold px-4 py-2 rounded-full tracking-wider">
              Sold Out
            </span>
          </div>
        )}

        {/* Quick Add overlay (desktop hover) */}
        <div className="absolute bottom-4 left-4 right-4 translate-y-14 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hidden md:block">
          <button
            onClick={handleAddToCart}
            disabled={displayStock <= 0 || isAdding}
            className="w-full h-[44px] bg-white/95 backdrop-blur-xl rounded-full text-[13px] font-semibold text-[#1E1E1E] hover:bg-[#E9897E] hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            Quick Add
          </button>
        </div>
      </Link>

      {/* ── PRODUCT INFO (p-6) ── */}
      <div className="p-3 md:p-5 flex flex-col flex-1">
        {/* Category */}
        <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#E9897E] mb-1">
          {product.category_slug || "Premium"}
        </p>

        {/* Title */}
        <Link href={`/products/${product.id}`} className="block group/title">
          <h3 className="text-[14px] md:text-[16px] font-bold leading-5 text-[#1E1E1E] line-clamp-2 group-hover/title:text-[#E9897E] transition-colors duration-200 md:duration-300 mt-1">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className="w-3.5 h-3.5 text-[#F4B740] fill-current" />
            ))}
          </div>
          <span className="text-[14px] text-[#6B6B6B]">4.8</span>
          <span className="text-[12px] text-[#9A9A9A]">(120)</span>
        </div>

        {/* Price Row */}
        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          {offerData?.hasOffer ? (
            <>
              <span className="text-[18px] md:text-[24px] font-extrabold text-[#1E1E1E]">
                ₹{offerData.discountedPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[12px] md:text-sm line-through text-[#9A9A9A]">
                ₹{displayPrice.toLocaleString('en-IN')}
              </span>
              <span className="text-[13px] font-bold text-[#E9897E]">
                {offerData.offer?.displayText || `${discountPercent}% off`}
              </span>
            </>
          ) : (
            <span className="text-[18px] md:text-[24px] font-extrabold text-[#1E1E1E]">
              ₹{displayPrice.toLocaleString('en-IN')}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={displayStock <= 0 || isAdding}
          className={cn(
            "w-full h-10 md:h-12 rounded-xl text-[12px] md:text-sm font-semibold flex items-center justify-center gap-2.5 mt-4 transition-all duration-200 md:duration-300 active:scale-[0.97]",
            displayStock <= 0
              ? "bg-[#F0F0F0] text-[#9A9A9A] cursor-not-allowed"
              : "bg-[#E9897E] text-white hover:bg-[#C86B5F] shadow-[0_6px_20px_rgba(233,137,126,0.25)] hover:shadow-[0_10px_28px_rgba(233,137,126,0.30)] hover:-translate-y-0.5"
          )}
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              {displayStock <= 0 ? "Sold Out" : "Add to Cart"}
            </>
          )}
        </button>
      </div>
    </div>
  );
});

export default ProductCard;
