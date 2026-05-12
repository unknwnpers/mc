"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { db } from "@/lib/firebase";
import { SavedAddress } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { doc, setDoc, collection, getDocs, deleteDoc, query, where, limit, orderBy } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  User, Mail, MapPin, Phone, Save, ArrowRight, Loader2, Heart, Trash2,
  ShoppingBag, Star, Edit2, X, Check, Box, ChevronRight, LayoutDashboard,
  Clock, Package, ShieldCheck, Zap, Smartphone, Globe
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- UTILS ---
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// --- COMPONENTS ---

function AccountTips() {
  const tips = [
    { text: "All your info is up to date", active: true },
    { text: "Connected tabs for easy access", active: true },
    { text: "Quick actions in one place", active: true },
    { text: "Simplified and clutter-free", active: true },
    { text: "Mobile responsive ready", active: true },
    { text: "Future features can be added easily", active: true },
  ];

  return (
    <div className="bg-white p-8 rounded-[36px] border border-[#F3E8E5] shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <h3 className="text-xl font-serif font-bold text-charcoal">Account <span className="text-blush italic">Tips</span></h3>
      </div>
      <div className="space-y-4">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className="text-[13px] font-medium text-neutral-600">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YourPriority() {
  const priorities = [
    { label: "Recent Orders", meta: "Most Important" },
    { label: "Wishlist", meta: "" },
    { label: "Addresses", meta: "" },
    { label: "Profile Info", meta: "" },
  ];

  return (
    <div className="bg-white p-8 rounded-[36px] border border-[#F3E8E5] shadow-sm mt-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
          <Heart className="w-5 h-5 fill-current" />
        </div>
        <h3 className="text-xl font-serif font-bold text-charcoal">Your <span className="text-blush italic">Priority</span></h3>
      </div>
      <div className="space-y-4">
        {priorities.map((p, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50/50">
            <div className="flex items-center gap-4">
              <span className="w-6 h-6 rounded-full bg-blush/10 flex items-center justify-center text-[11px] font-black text-blush">{i + 1}</span>
              <span className="text-[13px] font-bold text-charcoal">{p.label}</span>
            </div>
            {p.meta && <span className="text-[9px] font-black uppercase tracking-widest text-blush">{p.meta}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileContent() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Auth Provider Detect
  const isPhoneUser = user?.providerData?.some(p => p.providerId === 'phone') || false;

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || user?.phoneNumber?.replace("+91", "") || "");
      setEmail(profile.email || user?.email || "");
    }
  }, [profile, user]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch Favorites
    setFavLoading(true);
    try {
      const favRef = collection(db, "users", user.uid, "favorites");
      const favSnap = await getDocs(favRef);
      setFavorites(favSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setFavLoading(false); }

    // Fetch Addresses
    setAddressesLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/user/addresses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setAddresses(data.addresses || []);
    } catch (e) { console.error(e); } finally { setAddressesLoading(false); }

    // Fetch Recent Orders
    setOrdersLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(2)
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); } finally { setOrdersLoading(false); }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase() || null
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "orders", label: "Orders", icon: Box },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "addresses", label: "Addresses", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F7] selection:bg-blush/20">
      <Navbar />

      <main className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr_360px] gap-8 items-start">

          {/* COLUMN 1: PROFILE SUMMARY */}
          <aside className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-20 h-20 bg-cream rounded-[30px] flex items-center justify-center text-blush border border-blush/5 relative shadow-inner">
                    <User className="w-10 h-10" strokeWidth={1.5} />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center text-white">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-neutral-400">Welcome back,</p>
                    <h2 className="text-2xl font-serif font-bold text-charcoal leading-tight truncate">{profile?.name?.split(' ')[0] || 'User'} 👋</h2>
                    <p className="text-[11px] font-medium text-neutral-400 mt-1">Manage your account</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="pb-6 border-b border-neutral-50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Profile Summary</span>
                        <button className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                            <Edit2 className="w-3 h-3" /> Edit Profile
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Name</p>
                                <p className="text-[13px] font-bold text-charcoal">{profile?.name || 'Not set'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Email</p>
                                <p className="text-[13px] font-bold text-charcoal truncate">{profile?.email || 'Not set'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 flex items-center gap-2">
                                    Mobile
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Verified</span>
                                </p>
                                <p className="text-[13px] font-bold text-charcoal">{profile?.phone || 'Not set'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 pt-2">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                {isPhoneUser ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Linked to</p>
                                <p className="text-[13px] font-bold text-blush">{isPhoneUser ? 'Phone Identity' : 'Google Cloud'}</p>
                            </div>
                        </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full bg-blush text-white py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blush/20 hover:bg-[#ef7f6d] transition-all"
                  >
                    Edit Profile Details
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-cream rounded-full blur-3xl opacity-20 -mr-10 -mt-10" />
            </div>
          </aside>

          {/* COLUMN 2: MAIN CONTENT & TABS */}
          <section className="min-w-0">
            {/* Tab Navigation */}
            <div className="bg-white p-3 rounded-[32px] border border-[#F3E8E5] shadow-sm mb-8 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-4 rounded-[24px] text-[13px] font-bold transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-cream text-blush shadow-inner"
                      : "bg-transparent text-neutral-400 hover:text-charcoal hover:bg-neutral-50"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blush" : "text-neutral-300")} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dashboard View (Default Content) */}
            {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Recent Orders Widget */}
                    <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-charcoal">Recent <span className="text-blush italic">Orders</span></h3>
                            </div>
                            <Link href="/orders" className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1 hover:underline">
                                View all orders <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {ordersLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-24 rounded-3xl" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-10 text-center bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                                <p className="text-sm font-medium text-neutral-400">No recent orders found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 bg-neutral-50/50 rounded-[32px] border border-transparent hover:border-blush/10 hover:bg-white hover:shadow-xl transition-all duration-300">
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-neutral-100 flex-shrink-0">
                                                {order.items?.[0]?.image ? (
                                                    <img src={order.items[0].image} className="w-full h-full object-cover" alt="" />
                                                ) : <Box className="w-full h-full p-6 text-neutral-100" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-charcoal text-sm">Order #{order.id.slice(-6).toUpperCase()}</h4>
                                                <p className="text-[11px] font-medium text-neutral-400 mt-1">{formatDate(order.createdAt)} • {order.items?.length || 0} items</p>
                                                <p className="text-[13px] font-black text-blush mt-1.5">₹{order.total?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 md:mt-0 flex items-center justify-between md:justify-end gap-6">
                                            <div className="flex flex-col items-end">
                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                                    <Check className="w-3 h-3" /> Delivered
                                                </span>
                                                <p className="text-[9px] font-medium text-neutral-400 mt-1.5">Delivered on {formatDate(order.createdAt)}</p>
                                            </div>
                                            <Link href={`/orders/${order.id}`} className="px-6 py-2.5 border border-neutral-200 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-charcoal hover:text-white hover:border-charcoal transition-all">
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Wishlist Snapshot Widget */}
                    <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-sm">
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-charcoal">My <span className="text-blush italic">Wishlist</span></h3>
                            </div>
                            <button onClick={() => setActiveTab('wishlist')} className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1 hover:underline">
                                View all wishlist <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>

                        {favLoading ? (
                            <Skeleton className="h-32 rounded-3xl" />
                        ) : favorites.length === 0 ? (
                            <div className="py-10 text-center bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                                <p className="text-sm font-medium text-neutral-400">Your wishlist is empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {favorites.slice(0, 2).map(item => (
                                    <div key={item.id} className="flex items-center gap-4 p-5 bg-neutral-50/50 rounded-[32px] group hover:bg-white hover:shadow-lg transition-all">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden border border-neutral-100 flex-shrink-0">
                                            <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-charcoal text-[13px] truncate">{item.name}</h4>
                                            <p className="text-[11px] font-medium text-neutral-400 mt-0.5">₹{item.price}</p>
                                            <span className="inline-block mt-2 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">In Stock</span>
                                        </div>
                                        <button className="p-3 bg-white shadow-sm rounded-xl text-blush hover:bg-blush hover:text-white transition-all">
                                            <ShoppingBag className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Addresses Widget */}
                    <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-sm">
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-serif font-bold text-charcoal">Saved <span className="text-blush italic">Addresses</span></h3>
                            </div>
                            <button onClick={() => setActiveTab('addresses')} className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1 hover:underline">
                                Manage addresses <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>

                        {addressesLoading ? (
                            <Skeleton className="h-24 rounded-3xl" />
                        ) : addresses.length === 0 ? (
                            <div className="py-10 text-center bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                                <p className="text-sm font-medium text-neutral-400">No saved addresses</p>
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-4">
                                {addresses.slice(0, 1).map(addr => (
                                    <div key={addr.id} className="flex-1 p-6 bg-neutral-50/50 rounded-[32px] border border-transparent hover:border-blush/10 hover:bg-white hover:shadow-xl transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-charcoal text-sm">{addr.name}</span>
                                                <span className="text-[9px] bg-rose-50 text-blush px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Default</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 text-neutral-400 hover:text-blush"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button className="p-2 text-neutral-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-medium text-neutral-500 flex items-center gap-2"><Phone className="w-3 h-3" /> +91 {addr.phone}</p>
                                            <p className="text-[11px] font-medium text-neutral-600 flex items-start gap-2 leading-relaxed">
                                                <MapPin className="w-3 h-3 mt-1 text-blush" />
                                                {addr.addressLine1}, {addr.city}<br />{addr.state} - {addr.pincode}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => setActiveTab('addresses')} className="flex flex-col items-center justify-center p-6 bg-neutral-50/50 border border-dashed border-neutral-200 rounded-[32px] text-neutral-400 hover:border-blush hover:text-blush transition-all md:w-48 group">
                                    <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <X className="w-5 h-5 rotate-45" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Add New</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TODO: Add logic for other tabs using existing functions to prevent break */}
            {activeTab !== 'profile' && (
                <div className="bg-white p-12 rounded-[40px] border border-[#F3E8E5] text-center min-h-[400px] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center text-blush/40 border border-blush/5 mb-4">
                        <LayoutDashboard className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-charcoal">More sections coming soon</h3>
                    <p className="text-sm text-neutral-400 max-w-xs">We are moving our existing features into this new unified profile layout.</p>
                    <button onClick={() => setActiveTab('profile')} className="text-blush font-bold text-sm hover:underline">Back to Dashboard</button>
                </div>
            )}
          </section>

          {/* COLUMN 3: ACCOUNT WIDGETS */}
          <aside className="space-y-8 hidden xl:block">
            <AccountTips />
            <YourPriority />
          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center font-serif italic text-2xl text-blush">
        Loading...
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
