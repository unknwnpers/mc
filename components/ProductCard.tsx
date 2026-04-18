"use client";

import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Get thumbnail URL from original image URL
 * Since we only upload 'original' variant currently, return the original URL directly.
 * When thumbnail generation is added, this can convert:
 *   .../original/123-image.jpg → .../thumbnail/123-image.jpg
 */
function getThumbnailUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl === '/placeholder.svg') {
    return '/placeholder.svg';
  }
  
  // Return original URL - thumbnails are not currently generated during upload
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

  // Get image from images array (first image) or fallback
  const originalImage = product.images?.[0] || '/placeholder.svg';
  // Use thumbnail for faster loading in card view
  const displayImage = getThumbnailUrl(originalImage);

  // Get price from first variant or fallback to 0
  const displayPrice = product.variants?.[0]?.price ?? 0;

  // Get stock from first variant or fallback to 0
  const displayStock = product.variants?.[0]?.stock ?? 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.info("Please login to add items to cart");
      router.push(`/login?redirect=/products/${product.id}`);
      return;
    }

    const variants = product.variants;
    const hasVariants = variants && variants.length > 0;

    // If product has multiple variants, force selection on detail page
    if (hasVariants && variants.length > 1) {
      toast.info("Please select a size first");
      router.push(`/products/${product.id}`);
      return;
    }

    setIsAdding(true);

    try {
      // If product has exactly one variant, use it directly
      if (hasVariants && variants.length === 1) {
        const variant = variants[0];
        
        // Check stock
        if (variant.stock <= 0) {
          toast.error("Sorry, this item is out of stock");
          return;
        }

        await addToCart({
          id: product.id,
          name: product.name,
          price: variant.price,
          image: displayImage,
          quantity: 1,
          stock: variant.stock,
          sku: variant.sku,
          selectedSize: variant.options?.Size || variant.sku,
        });
        
        // Navigate to cart after successful add
        router.push('/cart');
        return;
      }

      // Fallback for products without variants (legacy)
      await addToCart({
        id: product.id,
        name: product.name,
        price: displayPrice,
        image: displayImage,
        quantity: 1,
        stock: displayStock,
        sku: product.id,
        selectedSize: "Free Size"
      });
      
      // Navigate to cart after successful add
      router.push('/cart');
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition duration-300 flex flex-col h-full">
      {/* Image Section */}
      <Link href={`/products/${product.id}`} className="relative overflow-hidden aspect-[4/5] block">
        {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
        
        <Image
          src={displayImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          onLoad={() => setImgLoading(false)}
          className={cn(
            "object-cover group-hover:scale-105 transition duration-500",
            imgLoading ? "opacity-0" : "opacity-100",
            displayStock <= 0 && "grayscale opacity-50"
          )}
        />

        {displayStock <= 0 && (
          <span className="absolute top-3 left-3 bg-black text-white text-xs uppercase font-bold px-2 py-1 rounded tracking-widest z-20">
            Out of Stock
          </span>
        )}
      </Link>

      {/* Info Section */}
      <div className="p-5 flex flex-col flex-1">
        <Link href={`/products/${product.id}`} className="block group/title">
          <h3 className="font-serif font-bold text-charcoal text-xl line-clamp-1 group-hover/title:text-blush transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em] font-bold">
          {product.category_slug || "Collection"}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4">
          <span className="font-bold text-blush text-xl tracking-tight">
            ₹{displayPrice}
          </span>

          <button 
            onClick={handleAddToCart}
            disabled={displayStock <= 0 || isAdding}
            className={cn(
              "text-sm px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blush/10 flex items-center gap-2",
              displayStock <= 0 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isAdding
                  ? "bg-blush/80 text-white cursor-wait"
                  : "bg-blush text-white hover:bg-[#f48c82]"
            )}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : displayStock <= 0 ? (
              "Out of Stock"
            ) : (
              "Add"
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;