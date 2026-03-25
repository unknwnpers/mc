"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Clock, CheckCircle2, Truck, Box, MapPin, Phone, User, Package, Calendar, CalendarCheck, Clock3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusConfig: any = {
    created: { label: "Order Placed", color: "bg-neutral-100 text-neutral-600", icon: Clock, desc: "Your order has been received and is waiting for processing." },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box, desc: "We are preparing your items for shipment." },
    shipped: { label: "Shipped", color: "bg-blue-100 text-blue-600", icon: Truck, desc: "Your order is on its way to your delivery address." },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2, desc: "Order has been successfully delivered. Hope you love it!" },
};

const getOrderDate = (createdAt: any) => {
    if (!createdAt?.seconds) return "";
    return new Date(createdAt.seconds * 1000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getOrderTime = (createdAt: any) => {
    if (!createdAt?.seconds) return "";
    return new Date(createdAt.seconds * 1000).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const getRelativeTime = (createdAt: any) => {
    if (!createdAt?.seconds) return "";
    const diffMs = Date.now() - createdAt.seconds * 1000;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `About ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return "";
};

export default function OrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && id) {
            fetchOrder();
        } else if (!user && !loading) {
            router.push("/login");
        }
    }, [user, id]);

    const fetchOrder = async () => {
        try {
            const snap = await getDoc(doc(db, "orders", id as string));
            if (snap.exists()) {
                const data = snap.data();
                // Security check: ensure user owns this order
                if (data.userId === user?.uid) {
                    setOrder({ id: snap.id, ...data });
                } else {
                    router.push("/orders");
                }
            } else {
                router.push("/orders");
            }
        } catch (error) {
            console.error("Error fetching order:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blush border-r-transparent" />
            </div>
        );
    }

    if (!order) return null;

    const status = statusConfig[order.status] || statusConfig.created;
    const StatusIcon = status.icon;

    const orderTimestamp = order.createdAt || order.updatedAt;

    // Format Date
    const formattedDate = getOrderDate(orderTimestamp) || "Recently";

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main className="pt-32 pb-24">
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="max-w-5xl mx-auto">
                    {/* BREADCRUMB */}
                    <Link 
                        href="/orders" 
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-blush transition-colors mb-10 font-bold text-xs uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Orders
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* LEFT COLUMN: STATUS & ITEMS */}
                        <div className="lg:col-span-2 space-y-12">
                            {/* STATUS CARD */}
                            <div className="bg-white rounded-[48px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">Order Tracking</p>
                                        <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight">#{order.id.toUpperCase().slice(0, 12)}</h1>
                                        
                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                                            <span>{getOrderDate(orderTimestamp)}</span>
                                            <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                            <span>{getOrderTime(orderTimestamp)}</span>
                                            {getRelativeTime(orderTimestamp) && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                                    <span className="text-blush">{getRelativeTime(orderTimestamp)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className={cn("inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all", status.color)}>
                                        <StatusIcon className="w-4 h-4" />
                                        {status.label}
                                    </div>
                                </div>

                                <div className="p-10 bg-cream/30 rounded-[32px] border border-blush/10 flex items-start gap-8">
                                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-blush/5 text-blush shrink-0 border border-blush/10">
                                        <StatusIcon className="w-7 h-7" />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-xl font-serif font-bold text-charcoal mb-2">{status.label}</p>
                                        <p className="text-neutral-500 font-sans leading-relaxed text-sm">
                                            Placed on {getOrderDate(orderTimestamp)} at {getOrderTime(orderTimestamp)}. <br />
                                            {status.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ITEMS CARD */}
                            <div className="bg-white rounded-[48px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                <h2 className="text-2xl font-serif font-bold text-charcoal mb-10 flex items-center gap-4">
                                    <Package className="w-6 h-6 text-blush" />
                                    Items In Parcel <span className="text-neutral-300 font-sans text-lg font-medium">({order.items.length})</span>
                                </h2>
                                
                                <div className="space-y-8">
                                    {order.items.map((item: any, i: number) => (
                                        <div key={i} className="flex gap-8 items-center group">
                                            <div className="h-24 w-24 bg-cream rounded-3xl overflow-hidden border border-[#F3E8E5] shrink-0">
                                                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-serif font-bold text-xl text-charcoal mb-0.5 truncate">{item.name}</p>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Quantity: {item.quantity}</p>
                                                    {item.selectedSize && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                                            <p className="text-[10px] text-blush font-bold uppercase tracking-widest">Size: {item.selectedSize}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-serif font-bold text-xl text-charcoal">₹{item.price * item.quantity}</p>
                                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">₹{item.price} ea</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-12 border-t border-[#F3E8E5] space-y-6">
                                    <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                        <span>Subtotal</span>
                                        <span className="font-serif text-lg text-charcoal">₹{order.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                        <span>Delivery</span>
                                        <span className="text-green-600 font-bold">FREE</span>
                                    </div>
                                    <div className="bg-charcoal rounded-[32px] p-8 flex justify-between items-center shadow-2xl shadow-charcoal/20">
                                        <span className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Total Amount Paid</span>
                                        <span className="text-3xl font-serif font-bold text-white tracking-tight">₹{order.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: DELIVERY & SUMMARY */}
                        <div className="space-y-12">
                             {/* CUSTOMER INFO */}
                             <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-[#F3E8E5] pb-6">
                                    Recipient
                                </h2>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Name</p>
                                            <p className="font-serif font-bold text-lg text-charcoal">{order.userName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Phone</p>
                                            <p className="font-serif font-bold text-lg text-charcoal">{order.phone}</p>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             {/* SHIPPING INFO */}
                             <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-[#F3E8E5] pb-6">
                                    Shipping
                                </h2>
                                <div className="flex gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div className="pt-1">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Delivery Address</p>
                                        <p className="font-sans font-medium text-charcoal/80 leading-relaxed text-sm">{order.address}</p>
                                    </div>
                                </div>
                             </div>

                             {/* TIME INFO */}
                             <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-[#F3E8E5] pb-6">
                                    Date & Time
                                </h2>
                                <div className="space-y-8">
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                            <CalendarCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Ordered On</p>
                                            <p className="font-serif font-bold text-lg text-charcoal">{formattedDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-[#FFF7ED] flex items-center justify-center text-[#F8AFA6] border border-[#F8AFA6]/10">
                                            <Clock3 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Time</p>
                                            <p className="font-serif font-bold text-lg text-charcoal">{getOrderTime(orderTimestamp)}</p>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             <div className="p-8 bg-cream/10 rounded-[40px] border border-dashed border-blush/20 text-center">
                                 <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Need Help?</p>
                                 <p className="text-xs text-charcoal/60 leading-relaxed px-4">
                                     Our customer experience team is here for you.
                                 </p>
                                 <a href="mailto:support@miks&chiks" className="inline-block mt-4 text-xs font-bold text-blush hover:underline uppercase tracking-widest">Contact Support</a>
                             </div>
                        </div>
                    </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
