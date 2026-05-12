"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { db } from "@/lib/firebase";
import { SavedAddress } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { doc, setDoc, collection, getDocs, deleteDoc, query, where, limit, orderBy, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  User, Mail, MapPin, Phone, Save, ArrowRight, Loader2, Heart, Trash2,
  ShoppingBag, Star, Edit2, X, Check, Box, ChevronRight, LayoutDashboard,
  Clock, Package, ShieldCheck, Zap, Smartphone, Globe, CheckCircle2, Truck, XCircle, Plus,
  AlertCircle,
  Home,
  Briefcase,
  Map as MapIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- CONSTANTS ---
const statusConfig: any = {
  pending_payment: { label: "Pending Payment", color: "bg-neutral-100 text-neutral-600", icon: Clock, isCancelled: false },
  created: { label: "Order Placed", color: "bg-neutral-100 text-neutral-600", icon: Clock, isCancelled: false },
  paid: { label: "Paid", color: "bg-blue-100 text-blue-600", icon: CheckCircle2, isCancelled: false },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box, isCancelled: false },
  shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-600", icon: Truck, isCancelled: false },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2, isCancelled: false },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600", icon: XCircle, isCancelled: true },
  expired: { label: "Expired", color: "bg-gray-100 text-gray-500", icon: Clock, isCancelled: true },
};

// --- UTILS ---
const formatDate = (dateStr: string | any) => {
  if (!dateStr) return "";
  const date = dateStr.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
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

function OrdersTab({ userId, email, phone }: { userId: string; email?: string | null; phone?: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const orderQueries = [
      query(collection(db, "orders"), where("userId", "==", userId))
    ];

    if (email) {
      orderQueries.push(query(collection(db, "orders"), where("recipient.email", "==", email.toLowerCase())));
    }

    if (phone) {
      orderQueries.push(query(collection(db, "orders"), where("recipient.phone", "==", phone)));
    }

    // Since we have multiple queries, we'll merge them manually.
    // To keep it simple and real-time, we'll use onSnapshot on each and merge the results.
    const results = new Map<string, any>();
    const unsubscribes = orderQueries.map(q =>
      onSnapshot(q, (snap) => {
        snap.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));

        const allOrders = Array.from(results.values());
        allOrders.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setOrders(allOrders.filter(o => o.status !== 'expired'));
        setLoading(false);
      }, (err) => {
        console.error("Orders Listener Error:", err);
        setLoading(false);
      })
    );

    return () => unsubscribes.forEach(unsub => unsub());
  }, [userId, email, phone]);

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-[40px]" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-[#F3E8E5]">
        <div className="w-20 h-20 bg-cream rounded-3xl flex items-center justify-center mx-auto mb-6 text-blush/20">
          <Package className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-charcoal mb-2">No orders yet</h3>
        <p className="text-neutral-500 mb-8">When you place an order, it will appear here.</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-blush text-white px-8 py-3 rounded-xl font-bold hover:bg-[#f48c82] transition-all">
          Start Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== 'cancelled');
  const totalSpent = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[32px] border border-[#F3E8E5] shadow-sm">
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Orders</p>
              <p className="text-2xl font-serif font-bold text-charcoal">{orders.length}</p>
          </div>
          <div className="bg-charcoal p-6 rounded-[32px] shadow-lg shadow-charcoal/10">
              <p className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mb-1">Total Spent</p>
              <p className="text-2xl font-serif font-bold text-white">₹{totalSpent.toLocaleString()}</p>
          </div>
      </div>

      <div className="space-y-6">
        {orders.map((order) => {
          const status = statusConfig[order.status] || statusConfig.created;
          const StatusIcon = status.icon;

          return (
            <div key={order.id} className="bg-white rounded-[40px] border border-[#F3E8E5] p-8 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-neutral-50 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center text-blush shadow-inner">
                    <Box className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Order Ref</p>
                      <p className="font-mono text-[11px] text-neutral-500">#{order.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <h4 className="text-3xl font-serif font-bold text-charcoal tracking-tight">₹{order.total?.toLocaleString()}</h4>
                    <p className="text-[11px] font-medium text-neutral-400 mt-1">{formatDate(order.createdAt)} • {order.items?.length} items</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest", status.color)}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </div>
                  <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-50 rounded-2xl text-[11px] font-black uppercase tracking-widest text-charcoal hover:bg-charcoal hover:text-white transition-all">
                    Track <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1">
                  {order.items?.map((item: any, idx: number) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50 shadow-sm group-hover:shadow-md transition-shadow">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                      </div>
                      {item.quantity > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-charcoal text-white text-[9px] font-black h-4 w-4 rounded-md flex items-center justify-center border border-white">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden sm:flex items-center gap-3 text-neutral-400">
                    <MapPin className="w-4 h-4" />
                    <p className="text-[11px] font-medium max-w-[150px] truncate">{order.shipping?.address || "Address details..."}</p>
                </div>
              </div>

              <div className="absolute top-0 right-0 w-32 h-32 bg-cream rounded-full blur-3xl opacity-10 -mr-10 -mt-10" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WishlistTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const favRef = collection(db, "users", userId, "favorites");
    const unsubscribe = onSnapshot(favRef, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Wishlist Subscription Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch("/api/user/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        toast.success("Removed from wishlist");
      } else {
        toast.error("Failed to remove");
      }
    } catch (e) {
      toast.error("Error removing item");
    }
  };

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-[40px]" />)}</div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-[#F3E8E5]">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-500/20">
          <Heart className="w-10 h-10 fill-current" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-charcoal mb-2">Your wishlist is empty</h3>
        <p className="text-neutral-500 mb-8">Save items you love to find them easily later.</p>
        <Link href="/products" className="inline-flex items-center gap-2 bg-rose-400 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-500 transition-all">
          Explore Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {items.map((item) => (
        <div key={item.id} className="bg-white p-6 rounded-[40px] border border-[#F3E8E5] shadow-sm hover:shadow-xl transition-all duration-500 group flex items-center gap-6">
          <div className="w-32 h-40 bg-cream rounded-3xl overflow-hidden border border-[#F3E8E5] shrink-0">
             <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-bold text-xl text-charcoal mb-1 truncate">{item.name}</h4>
            <p className="text-2xl font-bold text-blush">₹{item.price}</p>
            <div className="flex items-center gap-3 mt-6">
                <Link href={`/products/${item.id}`} className="flex-1 bg-charcoal text-white py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-black transition-all">
                  View Product
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-3 border border-neutral-100 rounded-2xl text-neutral-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddressModal({
  isOpen,
  onClose,
  address,
  user
}: {
  isOpen: boolean;
  onClose: () => void;
  address?: SavedAddress;
  user: any
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    label: "Home",
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "Kerala",
    pincode: "",
    isDefault: false
  });

  useEffect(() => {
    if (address) {
      setFormData({
        label: address.label || "Home",
        name: address.name || "",
        phone: address.phone || "",
        addressLine1: address.addressLine1 || "",
        addressLine2: address.addressLine2 || "",
        landmark: address.landmark || "",
        city: address.city || "",
        state: address.state || "Kerala",
        pincode: address.pincode || "",
        isDefault: address.isDefault || false
      });
    } else {
      setFormData({
        label: "Home",
        name: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        landmark: "",
        city: "",
        state: "Kerala",
        pincode: "",
        isDefault: false
      });
    }
  }, [address, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.name.trim()) return toast.error("Name is required");
    if (!/^[6-9]\d{9}$/.test(formData.phone)) return toast.error("Invalid phone number");
    if (!formData.addressLine1.trim()) return toast.error("Address is required");
    if (!formData.city.trim()) return toast.error("City is required");
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) return toast.error("Invalid pincode");

    setLoading(true);
    try {
      const token = await user.getIdToken();
      const url = address ? `/api/user/addresses/${address.id}` : "/api/user/addresses";
      const method = address ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(address ? "Address updated" : "Address added");
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save address");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">
              {address ? "Edit" : "Add New"} <span className="text-blush italic">Address</span>
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
              <X className="w-6 h-6 text-neutral-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 p-1 bg-neutral-50 rounded-2xl w-fit">
              {["Home", "Office", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setFormData({ ...formData, label: l })}
                  className={cn(
                    "px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                    formData.label === l ? "bg-white text-blush shadow-sm" : "text-neutral-400 hover:text-charcoal"
                  )}
                >
                  {l === "Home" && <Home className="w-3.5 h-3.5 inline mr-1.5" />}
                  {l === "Office" && <Briefcase className="w-3.5 h-3.5 inline mr-1.5" />}
                  {l === "Other" && <MapPin className="w-3.5 h-3.5 inline mr-1.5" />}
                  {l}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Receiver's Name"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-charcoal focus:ring-2 focus:ring-blush/20"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">+91</span>
                   <input
                    type="tel"
                    placeholder="10-digit mobile"
                    className="w-full bg-neutral-50 border-none rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-charcoal focus:ring-2 focus:ring-blush/20"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0,10) })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Address Line 1</label>
              <input
                type="text"
                placeholder="House No, Building Name, Street"
                className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-charcoal focus:ring-2 focus:ring-blush/20"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">City</label>
                <input
                  type="text"
                  placeholder="City"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-charcoal focus:ring-2 focus:ring-blush/20"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest ml-1">Pincode</label>
                <input
                  type="text"
                  placeholder="6-digit PIN"
                  className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-charcoal focus:ring-2 focus:ring-blush/20"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0,6) })}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div
                onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                formData.isDefault ? "bg-blush border-blush" : "border-neutral-200 group-hover:border-blush/40"
              )}>
                {formData.isDefault && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500">Set as default address</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white py-5 rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-charcoal/20 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {address ? "Update" : "Save"} Address
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddressesTab({ user }: { user: any }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const addrRef = collection(db, "users", user.uid, "addresses");
    const q = query(addrRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      setAddresses(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt
      } as SavedAddress)));
      setLoading(false);
    }, (error) => {
      console.error("Addresses Subscription Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) toast.success("Address deleted");
      else toast.error("Failed to delete");
    } catch (e) {
      toast.error("Error deleting address");
    }
  };

  const handleEdit = (addr: SavedAddress) => {
    setSelectedAddress(addr);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedAddress(undefined);
    setModalOpen(true);
  };

  if (loading) return <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-[40px]" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-sm hover:shadow-xl transition-all duration-500">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="font-bold text-charcoal text-lg">{addr.name}</span>
                    {addr.isDefault && <span className="text-[10px] bg-rose-50 text-blush px-3 py-1 rounded-full font-black uppercase tracking-widest">Default</span>}
                </div>
                <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(addr)}
                      className="p-2 text-neutral-300 hover:text-blush transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>
             </div>
             <div className="space-y-3">
                <div className="flex items-center gap-3 text-neutral-500">
                    <Phone className="w-4 h-4 text-blush/40" />
                    <span className="text-sm font-medium">+91 {addr.phone}</span>
                </div>
                <div className="flex items-start gap-3 text-neutral-600 leading-relaxed">
                    <MapPin className="w-4 h-4 mt-1 text-blush/40" />
                    <span className="text-sm font-medium">
                        {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}<br />
                        {addr.city}, {addr.state} - {addr.pincode}
                    </span>
                </div>
             </div>
          </div>
        ))}
        <button
          onClick={handleAdd}
          className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-[#F3E8E5] rounded-[40px] text-neutral-400 hover:border-blush hover:text-blush transition-all group min-h-[220px]"
        >
            <div className="w-14 h-14 rounded-full border-2 border-current flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-7 h-7" />
            </div>
            <span className="text-sm font-black uppercase tracking-[0.2em]">Add New Address</span>
        </button>
      </div>

      <AddressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        address={selectedAddress}
        user={user}
      />
    </div>
  );
}

function ProfileContent() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    // Real-time Favorites
    const favRef = collection(db, "users", user.uid, "favorites");
    const unsubscribeFav = onSnapshot(favRef, (snap) => {
      setFavorites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFavLoading(false);
    });

    // Real-time Addresses
    const addrRef = collection(db, "users", user.uid, "addresses");
    const unsubscribeAddr = onSnapshot(addrRef, (snap) => {
      setAddresses(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedAddress)));
      setAddressesLoading(false);
    });

    return () => {
      unsubscribeFav();
      unsubscribeAddr();
    };
  }, [user, profile]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const userPhone = profile?.phone || user.phoneNumber?.replace("+91", "");
      const orderQueries = [
        query(collection(db, "orders"), where("userId", "==", user.uid))
      ];
      if (user.email) {
        orderQueries.push(query(collection(db, "orders"), where("recipient.email", "==", user.email.toLowerCase())));
      }
      if (userPhone) {
        orderQueries.push(query(collection(db, "orders"), where("recipient.phone", "==", userPhone)));
      }

      const snapshots = await Promise.all(orderQueries.map(q => getDocs(q)));
      const orderMap = new Map();
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          orderMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
      });

      const allOrders = Array.from(orderMap.values());
      allOrders.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setOrders(allOrders.filter(o => o.status !== 'expired').slice(0, 2));
    } catch (e) { console.error(e); } finally { setOrdersLoading(false); }
  }, [user, profile]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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
      setIsEditing(false);
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
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                          >
                              <Edit2 className="w-3 h-3" /> Edit Profile
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsEditing(false)}
                            className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5 hover:text-charcoal transition-opacity"
                          >
                              <X className="w-3 h-3" /> Cancel
                          </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Name</p>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-neutral-50 border-none rounded-lg p-2 text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-blush/20"
                                    placeholder="Full Name"
                                  />
                                ) : (
                                  <p className="text-[13px] font-bold text-charcoal">{profile?.name || 'Not set'}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Email</p>
                                {isEditing ? (
                                  <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-neutral-50 border-none rounded-lg p-2 text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-blush/20"
                                    placeholder="Email Address"
                                  />
                                ) : (
                                  <p className="text-[13px] font-bold text-charcoal truncate">{profile?.email || 'Not set'}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5 flex items-center gap-2">
                                    Mobile
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Verified</span>
                                </p>
                                {isEditing ? (
                                  <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-neutral-50 border-none rounded-lg p-2 text-[13px] font-bold text-charcoal focus:ring-1 focus:ring-blush/20"
                                    placeholder="Phone Number"
                                  />
                                ) : (
                                  <p className="text-[13px] font-bold text-charcoal">{profile?.phone || 'Not set'}</p>
                                )}
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

                  {isEditing && (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-charcoal text-white py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] shadow-lg shadow-charcoal/20 hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save Changes
                    </button>
                  )}
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
                            <button onClick={() => setActiveTab('orders')} className="text-[10px] font-black text-blush uppercase tracking-widest flex items-center gap-1 hover:underline">
                                View all orders <ChevronRight className="w-3 h-3" />
                            </button>
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
                                {orders.map(order => {
                                    const status = statusConfig[order.status] || statusConfig.created;
                                    return (
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
                                                    <span className={cn("flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border", status.color.replace('bg-', 'bg-opacity-50 border-'))}>
                                                        {status.label}
                                                    </span>
                                                    <p className="text-[9px] font-medium text-neutral-400 mt-1.5">{formatDate(order.createdAt)}</p>
                                                </div>
                                                <Link href={`/orders/${order.id}`} className="px-6 py-2.5 border border-neutral-200 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-charcoal hover:text-white hover:border-charcoal transition-all">
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">Add New</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Orders Tab View */}
            {activeTab === 'orders' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <OrdersTab
                  userId={user.uid}
                  email={user.email}
                  phone={profile?.phone || user.phoneNumber?.replace("+91", "")}
                />
              </div>
            )}

            {/* Wishlist Tab View */}
            {activeTab === 'wishlist' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <WishlistTab userId={user.uid} />
              </div>
            )}

            {/* Addresses Tab View */}
            {activeTab === 'addresses' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AddressesTab user={user} />
              </div>
            )}

            {/* Profile Tab logic handled by activeTab !== ... fallback if needed, but we explicitly listed them now */}
            {activeTab !== 'profile' && activeTab !== 'orders' && activeTab !== 'wishlist' && activeTab !== 'addresses' && (
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
