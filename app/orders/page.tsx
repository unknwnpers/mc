"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, ChevronRight, Clock, CheckCircle2, Truck, Box, ShoppingBag, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const statusConfig: any = {
    created: { label: "Order Placed", color: "bg-neutral-100 text-neutral-600", icon: Clock },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box },
    shipped: { label: "Shipped", color: "bg-blue-100 text-blue-600", icon: Truck },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2 },
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const getLabel = (dateStr: string) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";

    return formatDate(dateStr);
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;

    useEffect(() => {
        if (user === null) {
            setOrders([]);
            setLoading(false);
        } else if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Use query with explicit UID
            const q = query(
                collection(db, "orders"),
                where("userId", "==", user.uid),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(q);

            setOrders(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        } catch (error) {
            console.error("Orders Fetch Error:", error);
            // Fallback for missing index or other error
            try {
                const fallbackQ = query(
                    collection(db, "orders"),
                    where("userId", "==", user.uid)
                );
                const snapshot = await getDocs(fallbackQ);
                setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Fallback Fetch Error:", err);
                setOrders([]);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-rose-400 border-r-transparent"></div>
                    <p className="mt-4 text-neutral-600 font-medium">Fetching your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 md:px-10 py-32">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 bg-white rounded-[40px] flex items-center justify-center shadow-xl shadow-blush/10 border border-[#F3E8E5]">
                            <ShoppingBag className="w-10 h-10 text-blush" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-serif font-bold text-charcoal tracking-tight">Orders</h1>
                            <p className="text-neutral-500 font-sans text-lg">Your shopping history & tracking</p>
                        </div>
                    </div>

                    {user && orders.length > 0 && (
                        <div className="flex gap-4">
                            <div className="bg-white px-8 py-5 rounded-3xl border border-[#F3E8E5] shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-1">Total Spent</p>
                                <p className="text-2xl font-serif font-bold text-charcoal">₹{totalSpent}</p>
                            </div>
                            <div className="bg-charcoal px-8 py-5 rounded-3xl shadow-xl shadow-charcoal/10">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-1">Orders</p>
                                <p className="text-2xl font-serif font-bold text-white">{totalOrders}</p>
                            </div>
                        </div>
                    )}
                </div>

                {!user ? (
                    <div className="text-center py-32 bg-white rounded-[60px] border border-[#F3E8E5] shadow-xl shadow-blush/5">
                        <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">Account Required</h2>
                        <p className="text-neutral-500 mb-10 text-lg">Please login to view your order history and track shipments.</p>
                        <Link href="/login" className="bg-blush text-white px-12 py-5 rounded-2xl font-bold hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/20 active:scale-95 inline-block">
                            Login to Account
                        </Link>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[60px] border border-[#F3E8E5] shadow-xl shadow-blush/5">
                        <div className="w-24 h-24 bg-cream rounded-[40px] flex items-center justify-center mx-auto mb-8 text-blush/30">
                            <Package className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">No orders found</h2>
                        <p className="text-neutral-500 mb-12 max-w-sm mx-auto text-lg">Looks like you haven't placed any orders yet. Start shopping to fill this space!</p>
                        <Link href="/" className="inline-block bg-charcoal text-white px-14 py-5 rounded-2xl font-bold hover:bg-blush transition-all shadow-xl shadow-charcoal/10 active:scale-95">
                            Browse Collections
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {(() => {
                            // 1. Sort BEFORE grouping (Defensive)
                            const sortedOrders = [...orders].sort((a, b) => {
                                const timeA = a.createdAt?.seconds || 0;
                                const timeB = b.createdAt?.seconds || 0;
                                return timeB - timeA;
                            });

                            // 2. Group
                            const groups = sortedOrders.reduce((acc: any, order) => {
                                const date = order.createdAt?.seconds
                                    ? new Date(order.createdAt.seconds * 1000).toDateString()
                                    : "Recent Orders";
                                if (!acc[date]) acc[date] = [];
                                acc[date].push(order);
                                return acc;
                            }, {});

                            // 3. Sort Keys (Present -> Past)
                            const sortedDates = Object.keys(groups).sort((a, b) => {
                                if (a === "Recent Orders") return -1;
                                if (b === "Recent Orders") return 1;
                                return new Date(b).getTime() - new Date(a).getTime();
                            });

                            return sortedDates.map((date) => (
                                <div key={date} className="relative">
                                    {/* TIMELINE DATE HEADER */}
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="h-px flex-1 bg-neutral-200" />
                                        <h3 className="text-[11px] font-black text-neutral-400 uppercase tracking-[0.3em] whitespace-nowrap bg-neutral-50 px-6 py-2 rounded-full border border-neutral-100 shadow-sm">
                                            {getLabel(date)}
                                        </h3>
                                        <div className="h-px flex-1 bg-neutral-200" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-10">
                                        {groups[date].map((order: any) => {
                                            const status = statusConfig[order.status] || statusConfig.created;
                                            const StatusIcon = status.icon;
                                            const orderDate = order.createdAt?.seconds
                                                ? new Date(order.createdAt.seconds * 1000)
                                                : new Date();

                                            return (
                                                <div key={order.id} className="group bg-white rounded-[40px] border border-[#F3E8E5] shadow-sm hover:shadow-2xl hover:shadow-blush/10 transition-all duration-700 overflow-hidden relative">
                                                    {/* PREMIUM TIMESTAMP BADGE */}
                                                    <div className="absolute top-0 right-10 bg-cream px-6 py-2 rounded-b-2xl border-x border-b border-blush/10 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock className="w-3 h-3 text-blush/40" />
                                                        {formatDistanceToNow(orderDate, { addSuffix: true })}
                                                    </div>

                                                    <div className="p-8 pb-4 pt-10 flex flex-col md:flex-row gap-8 md:items-center justify-between">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Order Ref</p>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blush/20" />
                                                                <p className="font-mono text-neutral-500 text-xs">#{order.id.slice(0, 8)}</p>
                                                            </div>
                                                        <div className="flex flex-col gap-1">
                                                            <p className="text-4xl font-serif font-bold text-charcoal tracking-tight">₹{order.total}</p>
                                                            <p className="text-[11px] text-neutral-400 font-medium tracking-wide">
                                                                {orderDate.toLocaleString("en-IN", {
                                                                    day: "numeric",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </p>
                                                        </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <div className={cn("inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all", status.color)}>
                                                                <StatusIcon className="w-4 h-4" />
                                                                {status.label}
                                                            </div>
                                                            <Link
                                                                href={`/orders/${order.id}`}
                                                                className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-cream text-charcoal text-[10px] font-bold uppercase tracking-widest hover:bg-blush hover:text-white transition-all group/btn shadow-sm"
                                                            >
                                                                View Tracking
                                                                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    <div className="px-8 py-5 space-y-6">
                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-t border-neutral-50 pt-6">
                                                            {/* ITEMS PREVIEW (ANCHORED) */}
                                                            <div className="flex items-center gap-5 min-w-0 flex-1">
                                                                <div className="relative flex-shrink-0">
                                                                    <div className="h-20 w-20 rounded-2xl border border-[#f1eae4] bg-neutral-50 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                                                                        <img src={order.items[0]?.image} className="w-full h-full object-cover" />
                                                                    </div>
                                                                    {order.items.length > 1 && (
                                                                        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-charcoal text-white border-2 border-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                                                            +{order.items.length - 1}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex flex-col gap-1">
                                                                    <p className="text-sm font-bold text-charcoal truncate tracking-tight">
                                                                        {order.items[0]?.name}
                                                                        {order.items[0]?.selectedSize && (
                                                                            <span className="text-blush ml-2">({order.items[0].selectedSize})</span>
                                                                        )}
                                                                    </p>
                                                                    {order.items.length > 1 && (
                                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                                                            And {order.items.length - 1} more items
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* SHIPPING PREVIEW (OPTICALLY BALANCED) */}
                                                            <div className="lg:w-80 bg-[#FFF7ED] px-6 py-4 rounded-3xl border border-[#F3E8E5]/50 flex items-center gap-4 group/shipping cursor-pointer hover:bg-white hover:shadow-xl hover:shadow-[#FFF7ED]/50 transition-all duration-500">
                                                                <div className="h-12 w-12 shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-[#F3E8E5]/20 group-hover/shipping:scale-110 transition-transform">
                                                                    <MapPin className="w-5 h-5 text-[#C4A484]" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#B49474] mb-0.5">Delivering to</p>
                                                                    <p className="text-xs font-bold text-[#5C4033] truncate leading-tight">{order.shippingAddress || order.address || "Address missing"}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}