'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { db, Product } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { useCart } from '@/context/cart-context';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, Heart, Share2, ShieldCheck, Truck } from 'lucide-react';

export default function ProductDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, [id]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        {/* BACK BUTTON */}
        <Link href="/products" className="inline-flex items-center gap-2 text-neutral-400 hover:text-rose-400 font-bold text-sm uppercase tracking-widest mb-10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
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
            <nav className="flex mb-6 text-xs text-rose-400 uppercase tracking-widest font-black">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="mx-2 text-neutral-300">/</span>
              <span className="text-neutral-900">{product.name}</span>
            </nav>

            <h1 className="text-5xl md:text-6xl font-black text-neutral-900 mb-6 tracking-tighter leading-none">
              {product.name}
            </h1>

            <div className="flex items-center gap-6 mb-10">
              <p className="text-4xl font-black text-rose-500">
                ₹{product.price}
              </p>
              <div className="h-8 w-px bg-neutral-200" />
              <div className="flex flex-col">
                <p className="text-neutral-400 line-through text-sm font-bold">
                    ₹{Math.round(product.price * 1.2)}
                </p>
                <span className="text-green-500 text-xs font-black uppercase tracking-widest">
                    Save 20% Today
                </span>
              </div>
            </div>

            <div className="prose prose-neutral mb-12">
              <p className="text-lg text-neutral-500 leading-relaxed font-medium">
                {product.description || "Indulge in the finest collection of Miks & Chiks. This piece is crafted with care to ensure the highest quality and comfort for you and your little ones."}
              </p>
            </div>

            <div className="mt-auto space-y-8">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={() => {
                        if (product) {
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
                                quantity: 1
                            });
                        }
                    }}
                    className="flex-1 bg-rose-400 text-white px-8 py-5 rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-rose-200/50 font-black text-lg active:scale-95 flex items-center justify-center gap-3"
                >
                    <ShoppingCart className="w-6 h-6" />
                    Add to Cart
                </button>
                <button className="p-5 border-2 border-neutral-100 rounded-2xl hover:bg-neutral-50 transition-colors text-neutral-400 hover:text-rose-400">
                    <Heart className="w-6 h-6" />
                </button>
                <button className="p-5 border-2 border-neutral-100 rounded-2xl hover:bg-neutral-50 transition-colors text-neutral-400 hover:text-neutral-600">
                    <Share2 className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100/50">
                  <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-neutral-400">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-neutral-900 uppercase tracking-widest">Free Delivery</p>
                    <p className="text-[10px] font-bold text-neutral-400">On all orders above ₹999</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100/50">
                  <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-neutral-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                   <div>
                    <p className="text-xs font-black text-neutral-900 uppercase tracking-widest">Quality Assured</p>
                    <p className="text-[10px] font-bold text-neutral-400">100% Cotton & Safe Fabrics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED PRODUCTS */}
        {relatedProducts.length > 0 && (
            <section className="pt-24 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-neutral-900 tracking-tighter">You May <span className="text-rose-400">Also Like</span></h2>
                        <p className="text-neutral-400 font-medium mt-1">Perfect matches for this collection</p>
                    </div>
                    <Link href="/products" className="text-rose-400 font-black text-sm uppercase tracking-widest hover:underline">View All</Link>
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