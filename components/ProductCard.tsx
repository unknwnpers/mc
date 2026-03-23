"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/firebase';
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

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm hover:shadow-xl hover:shadow-rose-100/50 transition-all duration-500 flex flex-col h-full">
      <Link href={`/products/${product.id}`} className="flex-1">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
          {imgLoading && <Skeleton className="absolute inset-0 z-10 w-full h-full rounded-none" />}
          
          {/* STOCK BADGE */}
          {product.stock <= 0 && (
            <div className="absolute top-4 left-4 z-20 bg-neutral-900/90 backdrop-blur-md text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl">
              Out of Stock
            </div>
          )}

          <img
            src={product.image_url || product.image || '/placeholder.jpg'}
            alt={product.name}
            onLoad={() => setImgLoading(false)}
            className={cn(
               "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
               imgLoading ? "opacity-0" : "opacity-100",
               product.stock <= 0 && "grayscale opacity-50"
            )}
          />
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-neutral-800 mb-1 line-clamp-1 group-hover:text-rose-500 transition-colors">
            {product.name}
          </h3>
          <p className={cn("font-bold text-lg", product.stock <= 0 ? "text-neutral-400 line-through decoration-rose-500/30" : "text-rose-500")}>
            ₹{product.price}
          </p>
        </div>
      </Link>

      <div className="p-5 pt-0 mt-auto">
        <button
          disabled={product.stock <= 0}
          onClick={(e) => {
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
              image: product.image_url || product.image || '/placeholder.jpg',
              quantity: 1,
              stock: product.stock
            });
          }}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-[0.98]",
            product.stock <= 0 
              ? "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
              : "bg-neutral-900 text-white hover:bg-rose-500 shadow-lg shadow-neutral-200"
          )}
        >
          {product.stock <= 0 ? (
            "Unavailable"
          ) : (
            <>
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}