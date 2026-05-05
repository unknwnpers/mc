"use client";

import { useEffect, useState, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { UserProfile, Product, SavedAddress } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where, limit } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Mail, MapPin, Phone, Save, ArrowLeft, Loader2, Heart, Trash2, ExternalLink, ShoppingBag, Lock, Eye, EyeOff, Plus, Star, Edit2, X, Check, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { usePincode } from "@/hooks/use-pincode";

function ProfileContent() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Detect auth provider
  const isPhoneUser = user?.providerData?.some(p => p.providerId === 'phone') || false;
  const isGoogleUser = user?.providerData?.some(p => p.providerId === 'google.com') || false;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  useEffect(() => {
    if (profile) {
      // Only auto-populate if the local state is empty to prevent overwriting user typing
      if (!name) setName(profile.name || "");
      if (!phone) setPhone(profile.phone || user?.phoneNumber?.replace("+91", "") || "");
      if (!email) setEmail(profile.email || user?.email || "");
    }
  }, [profile, user]); // We keep dependencies but add conditional logic inside

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

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      setAddressesLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/addresses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAddresses(data.addresses || []);
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
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
    // Validation
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      return;
    }

    // Clean the phone number (remove +91 and non-digits) for validation
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "");
    
    if (phone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      toast.error("Please enter a valid 10-digit Indian phone number (starting with 6-9)");
      return;
    }

    setIsSaving(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone.trim();

      // 1. Uniqueness check for Email (if changed)
      if (trimmedEmail && trimmedEmail !== profile?.email?.toLowerCase()) {
        const emailQuery = query(
          collection(db, "users"), 
          where("email", "==", trimmedEmail),
          limit(1)
        );
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty && emailSnapshot.docs[0].id !== user.uid) {
          toast.error("This email is already associated with another account.");
          setIsSaving(false);
          return;
        }
      }

      // 2. Uniqueness check for Phone (if changed)
      if (trimmedPhone && trimmedPhone !== profile?.phone) {
        const phoneQuery = query(
          collection(db, "users"), 
          where("phone", "==", trimmedPhone),
          limit(1)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty && phoneSnapshot.docs[0].id !== user.uid) {
          toast.error("This phone number is already associated with another account.");
          setIsSaving(false);
          return;
        }
      }

      await updateProfile({ 
        name: name.trim(),
        phone: trimmedPhone,
        email: trimmedEmail || null
      });
      toast.success("Profile updated successfully");
      if (redirectPath) {
        router.push(redirectPath);
      }
    } catch (err) {
      console.error("Profile update error:", err);
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

  const deleteAddress = async (addressId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/user/addresses/${addressId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== addressId));
        toast.success("Address deleted");
      } else {
        toast.error("Failed to delete address");
      }
    } catch (err) {
      toast.error("Failed to delete address");
    }
  };

  const setDefaultAddress = async (addressId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/user/addresses/${addressId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setAddresses(prev => prev.map(a => ({
          ...a,
          isDefault: a.id === addressId,
        })));
        toast.success("Default address updated");
      } else {
        toast.error("Failed to update default address");
      }
    } catch (err) {
      toast.error("Failed to update default address");
    }
  };

  // Helper function to normalize address for comparison
  const normalizeAddress = (addr: Partial<SavedAddress>) => {
    return {
      name: (addr.name || "").trim().toLowerCase(),
      phone: (addr.phone || "").trim(),
      addressLine1: (addr.addressLine1 || "").trim().toLowerCase(),
      addressLine2: (addr.addressLine2 || "").trim().toLowerCase(),
      city: (addr.city || "").trim().toLowerCase(),
      state: (addr.state || "").trim().toLowerCase(),
      pincode: (addr.pincode || "").trim(),
    };
  };

  // Check if address already exists
  const isDuplicateAddress = (newAddr: Partial<SavedAddress>, excludeId?: string) => {
    const normalizedNew = normalizeAddress(newAddr);
    
    return addresses.some(existing => {
      if (excludeId && existing.id === excludeId) return false;
      
      const normalizedExisting = normalizeAddress(existing);
      
      return (
        normalizedExisting.addressLine1 === normalizedNew.addressLine1 &&
        normalizedExisting.addressLine2 === normalizedNew.addressLine2 &&
        normalizedExisting.city === normalizedNew.city &&
        normalizedExisting.state === normalizedNew.state &&
        normalizedExisting.pincode === normalizedNew.pincode
      );
    });
  };

  const handleAddressSave = async (addressData: Partial<SavedAddress>) => {
    if (!user) return;
    try {
      // Check for duplicates (exclude current address when editing)
      if (isDuplicateAddress(addressData, editingAddress?.id)) {
        toast.error("This address already exists. Please use a different address or edit the existing one.");
        return;
      }

      const token = await user.getIdToken();
      
      if (editingAddress) {
        // Update existing address
        const res = await fetch(`/api/user/addresses/${editingAddress.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addressData),
        });
        if (res.ok) {
          // Refetch addresses
          const fetchRes = await fetch("/api/user/addresses", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await fetchRes.json();
          if (data.success) setAddresses(data.addresses || []);
          toast.success("Address updated");
        } else {
          toast.error("Failed to update address");
        }
      } else {
        // Add new address
        const res = await fetch("/api/user/addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(addressData),
        });
        if (res.ok) {
          const data = await res.json();
          setAddresses(prev => [data.address, ...prev]);
          toast.success("Address added");
        } else {
          const errorData = await res.json();
          toast.error(errorData.error || "Failed to add address");
        }
      }
    } catch (err) {
      toast.error("Failed to save address");
    }
  };

  // Calculate profile completion percentage
  const profileCompletion = (() => {
    let score = 0;
    if (name.trim().length >= 3) score += 33.4;
    if (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) score += 33.3;
    if (phone.trim().length >= 10) score += 33.3;
    return Math.min(100, Math.round(score));
  })();

  const isProfileComplete = profileCompletion === 100;

  return (
    <div className="min-h-screen bg-[#FCF9F7]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-32">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* LEFT: PROFILE INFO */}
          <div className="lg:w-[360px] shrink-0">
            <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-2xl shadow-blush/5 sticky top-32 overflow-hidden">
              {/* Decorative Background Element */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-cream rounded-full opacity-50 blur-3xl pointer-events-none" />
              
              <div className="relative flex items-center gap-5 mb-10">
                <div className="h-20 w-20 bg-cream rounded-[30px] flex items-center justify-center text-blush shadow-inner border border-blush/5 relative">
                  <User className="w-10 h-10" />
                  {isProfileComplete && (
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight">My <span className="text-blush italic">Profile</span></h1>
                  <p className="text-neutral-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blush" />
                    Account & delivery
                  </p>
                </div>
              </div>

              {/* Profile Completion Tracker */}
              <div className="mb-10 p-6 bg-cream/30 rounded-[30px] border border-blush/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-charcoal uppercase tracking-wider">Profile Setup</span>
                  <span className={`text-xs font-black ${isProfileComplete ? 'text-emerald-600' : 'text-blush'}`}>{profileCompletion}%</span>
                </div>
                <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-inner border border-blush/5">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out rounded-full ${isProfileComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-blush to-rose-400'}`}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                {!isProfileComplete && (
                  <p className="text-[10px] text-neutral-400 font-medium mt-3 leading-relaxed">
                    Complete your details to unlock seamless <span className="text-blush font-bold">Checkout</span>
                  </p>
                )}
              </div>

              <div className="space-y-6 relative">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-2">Personal Identity</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-blush transition-colors" />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-5 py-5 bg-neutral-50 border-none rounded-[24px] focus:ring-2 focus:ring-blush/20 transition-all font-bold text-charcoal placeholder:text-neutral-300 shadow-sm text-sm"
                      placeholder="Your Full Name"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-2">Contact Email</label>
                  {/* Allow editing if: 
                      1. User is a Phone user
                      2. OR if the profile doesn't have an email yet (even for Google users)
                  */}
                  {(isPhoneUser || !profile?.email) ? (
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-blush transition-colors" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-5 py-5 bg-neutral-50 border-none rounded-[24px] focus:ring-2 focus:ring-blush/20 transition-all font-bold text-charcoal placeholder:text-neutral-300 shadow-sm text-sm"
                        placeholder="Add email for receipts"
                      />
                    </div>
                  ) : (
                    <div className="relative group opacity-60">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                      <input 
                        type="email" 
                        value={email || "Not provided"}
                        disabled
                        className="w-full pl-12 pr-5 py-5 bg-neutral-50 border-none rounded-[24px] font-bold text-charcoal text-sm cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 ml-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Mobile Number</label>
                    {isPhoneUser && (
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Verified</span>
                    )}
                  </div>
                  {isPhoneUser ? (
                    <div className="relative group opacity-60">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" />
                      <input 
                        type="tel" 
                        value={phone}
                        disabled
                        className="w-full pl-12 pr-5 py-5 bg-neutral-50 border-none rounded-[24px] font-bold text-charcoal text-sm cursor-not-allowed"
                      />
                    </div>
                  ) : (
                    <div className="relative group">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-blush transition-colors" />
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-12 pr-5 py-5 bg-neutral-50 border-none rounded-[24px] focus:ring-2 focus:ring-blush/20 transition-all font-bold text-charcoal placeholder:text-neutral-300 shadow-sm text-sm"
                        placeholder="10-digit number"
                      />
                    </div>
                  )}
                </div>

                {/* Auth provider badge */}
                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-[24px] border border-neutral-100/50">
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    Linked to
                  </span>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border ${
                    isPhoneUser ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-rose-600 bg-rose-50 border-rose-100'
                  }`}>
                    {isPhoneUser ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                        {isPhoneUser ? 'Phone Identity' : isGoogleUser ? 'Google Cloud' : 'Email Account'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-charcoal text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-blush transition-all shadow-xl shadow-charcoal/10 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 group mt-8"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      Update Identity
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: SAVED ITEMS & ADDRESSES */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Saved Items Column */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-blush" />
                    <h2 className="text-xl font-serif font-bold text-charcoal">Saved <span className="text-blush italic">Items</span></h2>
                    <span className="h-6 w-6 rounded-full bg-cream flex items-center justify-center text-blush font-bold text-xs">
                      {favorites.length}
                    </span>
                  </div>
                </div>

                {favLoading ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="bg-white border border-[#D4AF37]/40 shadow-lg shadow-[#D4AF37]/5 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                    <Heart className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" />
                    <p className="text-neutral-600 font-medium mb-4">No saved items</p>
                    <Link href="/products" className="text-sm font-bold text-blush hover:underline underline-offset-4">Browse Products</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {favorites.slice(0, 4).map((fav) => (
                      <div key={fav.id} className="group relative">
                        <Link href={`/products/${fav.productId || fav.id}`} className="block aspect-square rounded-2xl overflow-hidden bg-neutral-100">
                          <img 
                            src={fav.image} 
                            alt={fav.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </Link>
                        <button 
                          onClick={() => removeFavorite(fav.productId || fav.id)}
                          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-neutral-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="mt-2">
                          <p className="font-medium text-charcoal line-clamp-1">{fav.name}</p>
                          <p className="font-bold text-blush">₹{fav.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {favorites.length > 4 && (
                  <Link href="/products" className="block text-center text-sm font-bold text-blush mt-4 hover:underline">
                    View all {favorites.length} items
                  </Link>
                )}
              </div>
              {/* Saved Addresses Column */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blush/5 rounded-xl border border-blush/10">
                      <MapPin className="w-5 h-5 text-blush" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-charcoal tracking-tight">Delivery <span className="text-blush italic">Hub</span></h2>
                  </div>
                  <button
                    onClick={() => { setShowAddressForm(true); setEditingAddress(null); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blush text-white rounded-full font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blush/90 transition-all shadow-lg shadow-blush/20 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse bg-white rounded-3xl p-6 border border-[#F3E8E5]">
                        <div className="h-4 bg-neutral-100 rounded-full w-24 mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-neutral-100 rounded-full w-full"></div>
                          <div className="h-3 bg-neutral-100 rounded-full w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="bg-white border border-[#F3E8E5] shadow-xl shadow-blush/5 rounded-[40px] p-16 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-6 border border-blush/5">
                      <MapPin className="w-10 h-10 text-blush/40" />
                    </div>
                    <p className="text-charcoal font-serif text-xl font-bold mb-2">No Delivery Points</p>
                    <p className="text-neutral-400 text-sm mb-8 max-w-[200px] mx-auto leading-relaxed">Save your delivery locations for faster checkout experience.</p>
                    <button
                      onClick={() => { setShowAddressForm(true); setEditingAddress(null); }}
                      className="px-8 py-4 bg-charcoal text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-charcoal/10 hover:bg-blush transition-all active:scale-95"
                    >
                      Setup First Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div 
                        key={address.id}
                        className={`group relative bg-white rounded-[32px] p-6 border transition-all duration-300 hover:shadow-xl hover:shadow-blush/5 ${address.isDefault ? 'border-blush/30 bg-gradient-to-br from-white to-cream/30' : 'border-[#F3E8E5]'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="font-bold text-charcoal tracking-tight">{address.name}</span>
                              <span className="text-[9px] px-3 py-1 bg-neutral-100 rounded-full text-neutral-500 uppercase font-black tracking-widest">{address.label}</span>
                              {address.isDefault && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-blush uppercase tracking-widest bg-blush/5 px-2 py-1 rounded-full">
                                  <Star className="w-3 h-3 fill-current" />
                                  Default
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-neutral-400">
                                    <Phone className="w-3 h-3" />
                                    <span className="text-xs font-bold">+91 {address.phone}</span>
                                </div>
                                <div className="flex items-start gap-2 text-neutral-600">
                                    <MapPin className="w-3 h-3 mt-1 shrink-0 text-blush/40" />
                                    <p className="text-xs font-medium leading-relaxed">
                                        {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}<br />
                                        {address.city}, {address.state} — {address.pincode}
                                    </p>
                                </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingAddress(address); setShowAddressForm(true); }}
                              className="p-3 bg-neutral-50 text-neutral-400 hover:text-blush hover:bg-blush/5 rounded-2xl transition-all"
                              title="Edit Address"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteAddress(address.id)}
                              className="p-3 bg-neutral-50 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                              title="Delete Address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {!address.isDefault && (
                          <button
                            onClick={() => setDefaultAddress(address.id)}
                            className="mt-6 w-full py-2.5 bg-neutral-50 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blush/5 hover:text-blush transition-all"
                          >
                            Set as primary
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Password Change Section - only for admin users (phone users use OTP, not passwords) */}
            {isAdmin && <PasswordChangeSection />}

          </div>
        </div>

        {/* Address Form Modal */}
        {showAddressForm && (
          <AddressFormModal
            address={editingAddress}
            onClose={() => { setShowAddressForm(false); setEditingAddress(null); }}
            onSave={handleAddressSave}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

// Password Change Section Component
function PasswordChangeSection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<any>(null);

  useEffect(() => {
    fetchPasswordStatus();
  }, []);

  const fetchPasswordStatus = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/security/change-password', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPasswordStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch password status:', error);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }

    setIsChanging(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const res = await fetch('/api/admin/security/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        fetchPasswordStatus();
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-[#F3E8E5] shadow-xl shadow-blush/5 mt-8">
      <h3 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
        <Lock className="w-5 h-5 text-blush" />
        Change Password
      </h3>

      {passwordStatus?.daysUntilExpiration !== null && passwordStatus?.daysUntilExpiration !== undefined && (
        <div className={`p-3 rounded-xl text-sm mb-4 ${
          passwordStatus.daysUntilExpiration <= 7 
            ? 'bg-red-50 text-red-700' 
            : passwordStatus.daysUntilExpiration <= 30 
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-green-50 text-green-700'
        }`}>
          {passwordStatus.daysUntilExpiration <= 0 
            ? 'Your password has expired. Please change it now.'
            : `Password expires in ${passwordStatus.daysUntilExpiration} days`
          }
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Current Password</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-14 pr-12 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blush transition-colors"
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">New Password</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-14 pr-12 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-blush transition-colors"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Confirm New Password</label>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-300 group-focus-within:text-blush transition-colors" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full pl-14 pr-6 py-5 bg-neutral-50 border-none rounded-3xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300 ${
                confirmPassword && newPassword !== confirmPassword ? 'ring-2 ring-red-200' : ''
              }`}
              placeholder="Confirm new password"
            />
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500 ml-2">Passwords do not match</p>
          )}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={isChanging || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className="w-full bg-blush text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blush/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          {isChanging ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Update Password
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Address Form Modal Component
function AddressFormModal({ 
  address, 
  onClose, 
  onSave 
}: { 
  address: SavedAddress | null; 
  onClose: () => void; 
  onSave: (data: Partial<SavedAddress>) => Promise<void>;
}) {
  const [label, setLabel] = useState(address?.label || "Home");
  const [name, setName] = useState(address?.name || "");
  const [phone, setPhone] = useState(address?.phone || "");
  const [addressLine1, setAddressLine1] = useState(address?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(address?.addressLine2 || "");
  const [landmark, setLandmark] = useState(address?.landmark || "");
  const [city, setCity] = useState(address?.city || "");
  const [state, setState] = useState(address?.state || "Kerala");
  const [pincode, setPincode] = useState(address?.pincode || "");
  const [isDefault, setIsDefault] = useState(address?.isDefault || false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Pincode autofill hook
  const { data: pincodeData, loading: pincodeLoading, error: pincodeError, fetchPincode, clear: clearPincode } = usePincode(800);

  // Pincode to city/state/area autofill
  const handlePincodeChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 6);
    setPincode(cleanValue);
    setAutoFilled(false);
    
    if (cleanValue.length === 6) {
      const data = await fetchPincode(cleanValue);
      if (data) {
        setCity(data.district);
        setState(data.state);
        // If only one office, auto-select it for area
        if (data.offices.length === 1) {
          setAddressLine2(data.offices[0].name);
        }
        setAutoFilled(true);
        // Clear after 2 seconds
        setTimeout(() => setAutoFilled(false), 2000);
      }
    } else {
      clearPincode();
    }
  };

  // Check if form is valid
  const isFormValid = 
    name.trim().length >= 3 &&
    /^[6-9]\d{9}$/.test(phone) &&
    addressLine1.trim().length > 0 &&
    city.trim().length > 0 &&
    /^[1-9][0-9]{5}$/.test(pincode);

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit Indian phone number");
      return;
    }
    if (!addressLine1.trim()) {
      toast.error("House/Building name is required");
      return;
    }
    if (!city.trim()) {
      toast.error("City is required");
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit PIN code");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        label,
        name: name.trim(),
        phone,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state,
        pincode,
        isDefault,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[48px] p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-serif font-bold text-charcoal tracking-tight">
            {address ? <><span>Edit </span><span className="text-blush italic">Address</span></> : <><span>Add New </span><span className="text-blush italic">Address</span></>}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Label Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Address Type</label>
            <div className="flex gap-3">
              {["Home", "Office", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`px-5 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    label === l 
                      ? "bg-blush text-white" 
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Name & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                placeholder="Recipient name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                placeholder="9876543210"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">House / Building *</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
              placeholder="House name, building, street"
            />
          </div>

          {/* Address Line 2 & Landmark */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">
                Area / Locality {pincodeData && pincodeData.offices.length > 1 && "*"}
              </label>
              {pincodeData && pincodeData.offices.length > 1 ? (
                <select
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal"
                >
                  <option value="">Select area...</option>
                  {pincodeData.offices.map((office) => (
                    <option key={office.name} value={office.name}>
                      {office.name} {office.delivery === "Delivery" ? "(Delivery)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                  placeholder="Area name"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">Landmark</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                placeholder="Near..."
              />
            </div>
          </div>

          {/* City, PIN & State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300"
                placeholder="City name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">PIN Code *</label>
              <div className="relative">
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  className={`w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal placeholder:text-neutral-300 ${
                    autoFilled ? "ring-2 ring-green-400 bg-green-50/30" : ""
                  }`}
                  placeholder="686001"
                  maxLength={6}
                />
                {pincodeLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-blush animate-spin" />
                  </div>
                )}
                {autoFilled && !pincodeLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
              </div>
              {pincodeError && (
                <p className="text-xs text-red-500 ml-2">{pincodeError}</p>
              )}
              {autoFilled && (
                <p className="text-xs text-green-600 ml-2">
                  {pincodeData && pincodeData.offices.length > 1 
                    ? "City, state & areas loaded! Select your area." 
                    : "City & state auto-filled!"}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-neutral-400 uppercase tracking-[0.2em] ml-2">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-5 py-4 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-medium text-charcoal"
            >
              {pincodeData ? (
                // Show unique states from pincode data
                Array.from(new Set(pincodeData.offices.map((o: any) => o.state))).map((stateName: string) => (
                  <option key={stateName} value={stateName}>{stateName}</option>
                ))
              ) : (
                // Default options when no pincode entered
                <>
                  <option value="Kerala">Kerala</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Other">Other</option>
                </>
              )}
            </select>
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-3 cursor-pointer p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-5 h-5 rounded border-neutral-300 text-blush focus:ring-blush/20"
            />
            <div>
              <p className="font-bold text-charcoal text-sm">Set as default address</p>
              <p className="text-xs text-neutral-500">Use this address for checkout by default</p>
            </div>
          </label>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-neutral-100 rounded-2xl font-bold text-charcoal hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !isFormValid}
            className="flex-1 py-4 bg-blush text-white rounded-2xl font-bold hover:bg-[#f48c82] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : address ? "Update Address" : "Save Address"}
          </button>
        </div>
      </div>
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
