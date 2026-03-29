"use client";

import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { UserProfile, Product } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Mail, MapPin, Phone, Save, ArrowLeft, Loader2, Heart, Trash2, ExternalLink, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function ProfileContent() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      setFavLoading(true);
      try {
        const ref = collection(db, "users", user.uid, "favorites");
        const snapshot = await getDocs(ref);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFavorites(items);
      } catch (err) {
        console.error("Error fetching favorites:", err);
      } finally {
        setFavLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blush" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !phone.trim()) {
      toast.error("All profile fields are required for delivery");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), address: address.trim(), phone: phone.trim() });
      toast.success("Profile updated successfully");
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (err) {
      toast.error("Failed to update profile. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", productId));
      setFavorites(prev => prev.filter(i => i.productId !== productId));
      toast.info("Removed from saved items");
    } catch (err) {
      toast.error("Failed to remove item");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-32">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* LEFT: PROFILE INFO */}
          <div className="lg:w-1/3">
            <div className="bg-white p-10 rounded-[48px] border border-[#F3E8E5] shadow-2xl shadow-blush/5 sticky top-32">
              <div className="flex items-center gap-6 mb-12">
                <div className="h-20 w-20 bg-cream rounded-3xl flex items-center justify-center text-blush shadow-inner border border-blush/5">
                  <User className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-charcoal">My <span className="text-blush italic">Profile</span></h1>
                  <p className="text-neutral-400 font-medium text-xs mt-1">Manage your account & delivery</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                      placeholder="Enter your name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Email</label>
                  <div className="relative opacity-50">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300" />
                    <input 
                      type="email" 
                      value={user.email || ""}
                      disabled
                      className="w-full pl-14 pr-6 py-5 bg-neutral-50 border-none rounded-3xl font-medium text-charcoal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Delivery Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-5 top-5 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
                    <textarea 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300 min-h-[140px] resize-none"
                      placeholder="Detailed shipping address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                      placeholder="10-digit number"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blush text-white py-6 rounded-3xl font-bold text-lg hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 mt-4 group"
                >
                  {isSaving ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: SAVED ITEMS / FAVORITES */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-10 px-4">
               <div>
                  <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Saved <span className="text-blush italic">Items</span></h2>
                  <p className="text-neutral-400 font-medium text-xs mt-1">Products you loved the most</p>
               </div>
               <div className="h-10 w-10 rounded-full bg-cream flex items-center justify-center text-blush font-bold text-xs ring-4 ring-white">
                  {favorites.length}
               </div>
            </div>

            {favLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-[4/5] rounded-[48px]" />)}
              </div>
            ) : favorites.length === 0 ? (
               <div className="bg-cream/20 border-2 border-dashed border-[#F3E8E5] rounded-[48px] p-20 text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <Heart className="w-10 h-10 text-neutral-200" />
                  </div>
                  <h3 className="text-xl font-bold text-charcoal mb-4">No Favorites Yet</h3>
                  <p className="text-neutral-400 max-w-xs mx-auto mb-10 leading-relaxed font-sans">Start hearting products you love to build your personal wishlist here.</p>
                  <Link href="/products" className="inline-flex items-center gap-3 bg-white text-charcoal border border-neutral-100 px-8 py-4 rounded-2xl font-bold hover:border-blush hover:text-blush transition-all shadow-sm active:scale-95">
                    Explore Collection
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </Link>
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {favorites.map((fav) => (
                  <div key={fav.id} className="group bg-white rounded-[48px] overflow-hidden border border-[#F3E8E5] hover:shadow-2xl hover:shadow-blush/5 transition-all duration-700 flex flex-col h-full relative">
                    <Link href={`/products/${fav.productId || fav.id}`} className="relative aspect-[4/5] block overflow-hidden">
                       <img 
                        src={fav.image} 
                        alt={fav.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    </Link>
                    
                    <button 
                      onClick={() => removeFavorite(fav.productId || fav.id)}
                      className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-md rounded-2xl text-rose-400 hover:text-white hover:bg-rose-400 transition-all shadow-xl shadow-rose-900/10 hover:scale-110 active:scale-90 z-20"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <Link href={`/products/${fav.productId || fav.id}`} className="hover:text-blush transition-colors flex-1">
                          <h3 className="text-xl font-bold text-charcoal line-clamp-1">{fav.name}</h3>
                        </Link>
                        <span className="text-xl font-serif font-bold text-blush">₹{fav.price}</span>
                      </div>
                      
                      <Link 
                        href={`/products/${fav.productId || fav.id}`}
                        className="mt-auto w-full py-5 border border-charcoal/5 rounded-3xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest text-charcoal hover:bg-neutral-50 transition-all group/btn"
                      >
                        <ShoppingBag className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                        View Product
                        <ExternalLink className="w-4 h-4 text-neutral-300" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white font-serif italic text-2xl text-blush">
                Loading your profile...
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
