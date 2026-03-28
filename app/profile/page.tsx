"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { UserProfile, Product } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Mail, MapPin, Phone, Save, ArrowLeft, Loader2, Heart, Trash2, ExternalLink, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();

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
      await updateProfile({ name, address, phone });
      toast.success("Profile updated successfully");
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

      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="max-w-2xl mx-auto">
            {/* BREADCRUMB */}
            <Link 
              href="/cart" 
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-blush transition-colors mb-8 font-bold group text-[11px] uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Cart
            </Link>

            <div className="bg-white rounded-[40px] border border-[#F3E8E5] shadow-xl shadow-blush/5 overflow-hidden">
              {/* HEADER */}
              <div className="bg-cream/50 p-10 border-b border-[#F3E8E5] relative">
                  <div className="absolute top-0 right-0 p-10 opacity-5">
                    <User className="w-40 h-40 text-blush" />
                  </div>
                  
                  <div className="relative flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[32px] flex items-center justify-center shadow-lg border border-[#F3E8E5]">
                        <User className="w-10 h-10 text-blush" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight">Your Profile</h1>
                        <p className="text-neutral-500 font-sans mt-1">Manage your shipping and contact details</p>
                    </div>
                  </div>
              </div>

              {/* FORM */}
              <div className="p-10 space-y-10">
                  <div className="space-y-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Account Basics</h2>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">Display Name</label>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blush transition-colors" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                          className="w-full bg-cream/10 border border-[#F3E8E5] px-14 py-4 rounded-2xl focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans text-charcoal"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative opacity-60">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={user.email || ""}
                          disabled
                          className="w-full bg-neutral-50 border border-neutral-100 px-14 py-4 rounded-2xl font-sans text-neutral-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[#F3E8E5]" />

                  <div className="space-y-6">
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-6">Shipping & Contact</h2>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">Contact Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blush transition-colors" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          className="w-full bg-cream/10 border border-[#F3E8E5] px-14 py-4 rounded-2xl focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans text-charcoal"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-charcoal/70 uppercase tracking-widest ml-1">Shipping Address</label>
                      <div className="relative group">
                        <MapPin className="absolute left-5 top-6 w-4 h-4 text-gray-400 group-focus-within:text-blush transition-colors" />
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="House No, Building, Area, Street, Landmark..."
                          className="w-full bg-cream/10 border border-[#F3E8E5] pl-14 pr-6 py-5 rounded-2xl focus:ring-4 focus:ring-blush/10 focus:border-blush/50 transition-all font-sans min-h-[140px] text-charcoal leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blush text-white py-5 rounded-3xl font-bold text-lg hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70 transform hover:-translate-y-1"
                  >
                    {isSaving ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Save className="w-6 h-6" />
                    )}
                    {isSaving ? "Saving Changes..." : "Save Profile Details"}
                  </button>
              </div>
            </div>

            {/* SAVED ITEMS SECTION */}
            <div className="mt-16 mb-8">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-10 w-10 bg-cream rounded-2xl flex items-center justify-center text-blush border border-blush/10">
                    <Heart className="w-5 h-5 fill-current" />
                </div>
                <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">Saved <span className="text-blush italic">Items</span></h2>
              </div>

              {favLoading ? (
                <div className="grid grid-cols-2 gap-6">
                  {[1,2].map(i => <Skeleton key={i} className="h-64 w-full rounded-[32px]" />)}
                </div>
              ) : favorites.length === 0 ? (
                <div className="bg-cream/20 rounded-[40px] p-12 text-center border border-dashed border-blush/20">
                  <ShoppingBag className="w-12 h-12 text-blush/20 mx-auto mb-6" />
                  <p className="text-neutral-500 font-sans font-medium">Your wishlist is waiting to be filled.</p>
                  <Link href="/products" className="inline-block mt-6 text-xs font-bold text-blush uppercase tracking-widest hover:underline">Explore Products</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {favorites.map((item) => (
                    <div key={item.productId} className="group relative bg-white rounded-[32px] border border-[#F3E8E5] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-blush/5 transition-all duration-500">
                      <div className="aspect-[4/5] relative overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <button 
                          onClick={() => removeFavorite(item.productId)}
                          className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-xl text-neutral-400 hover:text-red-500 transition-colors shadow-lg active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="p-5">
                        <h3 className="font-serif font-bold text-lg text-charcoal mb-1 truncate">{item.name}</h3>
                        <div className="flex items-center justify-between">
                            <p className="text-blush font-bold text-lg">₹{item.price}</p>
                            <Link 
                              href={`/products/${item.productId}`}
                              className="p-2 text-neutral-300 hover:text-blush transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-center mt-12 text-neutral-400 text-[10px] uppercase tracking-widest font-bold">
              Your data is encrypted and used only for fulfilling your orders.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
