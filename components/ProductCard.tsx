"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [imgLoading, setImgLoading] = useState(true);

  const displayImage = product.image_url || product.image || '/placeholder.jpg';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info("Please login to add items to cart");
      router.push("/login");
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: displayImage,
      quantity: 1,
      stock: product.stock
    });
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition duration-300 flex flex-col h-full">
      {/* Image Section */}
      <Link href={`/products/${product.id}`} className="relative overflow-hidden aspect-[4/5] block">
        {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
        
        <img
          src={displayImage}
          alt={product.name}
          onLoad={() => setImgLoading(false)}
          className={cn(
            "w-full h-full object-cover group-hover:scale-105 transition duration-500",
            imgLoading ? "opacity-0" : "opacity-100",
            product.stock <= 0 && "grayscale opacity-50"
          )}
        />

        {product.stock <= 0 && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] uppercase font-bold px-2 py-1 rounded tracking-widest z-20">
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

        <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-bold">
          {product.category_slug || "Collection"}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4">
          <span className="font-bold text-blush text-xl tracking-tight">
            ₹{product.price}
          </span>

          <button 
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
            className={cn(
              "text-[11px] px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blush/10",
              product.stock <= 0 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blush text-white hover:bg-[#f48c82]"
            )}
          >
            {product.stock <= 0 ? "Empty" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}