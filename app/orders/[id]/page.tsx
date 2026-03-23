"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Clock, CheckCircle2, Truck, Box, MapPin, Phone, User, Package, Calendar, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusConfig: any = {
    created: { label: "Order Placed", color: "bg-neutral-100 text-neutral-600", icon: Clock, desc: "Your order has been received and is waiting for processing." },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box, desc: "We are preparing your items for shipment." },
    shipped: { label: "Shipped", color: "bg-blue-100 text-blue-600", icon: Truck, desc: "Your order is on its way to your delivery address." },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2, desc: "Order has been successfully delivered. Hope you love it!" },
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
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-400 border-r-transparent" />
            </div>
        );
    }

    if (!order) return null;

    const status = statusConfig[order.status] || statusConfig.created;
    const StatusIcon = status.icon;

    // Format Date
    const formattedDate = order.createdAt?.toDate 
        ? order.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : order.createdAt?.seconds
            ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : "Recently";

    return (
        <div className="min-h-screen bg-neutral-50/50">
            <Navbar />

            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* BREADCRUMB */}
                    <Link 
                        href="/orders" 
                        className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors mb-8 font-bold text-sm group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Orders
                    </Link>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* LEFT COLUMN: STATUS & ITEMS */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* STATUS CARD */}
                            <div className="bg-white rounded-[40px] border border-neutral-100 p-10 shadow-xl shadow-rose-100/10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Order Tracking</p>
                                        <h1 className="text-2xl font-black text-neutral-900">#{order.id.toUpperCase()}</h1>
                                    </div>
                                    <div className={cn("inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest", status.color)}>
                                        <StatusIcon className="w-4 h-4" />
                                        {status.label}
                                    </div>
                                </div>

                                <div className="p-8 bg-neutral-50 rounded-3xl border border-neutral-100 flex items-start gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-neutral-200/50 text-rose-400 shrink-0">
                                        <StatusIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-neutral-900 mb-1">{status.label}</p>
                                        <p className="text-sm text-neutral-500 font-medium leading-relaxed">{status.desc}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ITEMS CARD */}
                            <div className="bg-white rounded-[40px] border border-neutral-100 p-10 shadow-xl shadow-rose-100/10">
                                <h2 className="text-xl font-black text-neutral-900 mb-8 flex items-center gap-3">
                                    <Package className="w-5 h-5 text-rose-400" />
                                    Items In Parcel ({order.items.length})
                                </h2>
                                
                                <div className="space-y-6">
                                    {order.items.map((item: any, i: number) => (
                                        <div key={i} className="flex gap-6 items-center">
                                            <div className="h-20 w-20 bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100">
                                                <img src={item.image} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-neutral-900 truncate">{item.name}</p>
                                                <p className="text-sm text-neutral-500 font-bold">Qty: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-neutral-900">₹{item.price * item.quantity}</p>
                                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight">₹{item.price} each</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-10 pt-10 border-t border-neutral-100 space-y-4">
                                    <div className="flex justify-between items-center text-neutral-500 font-bold text-sm px-2">
                                        <span>Total Goods</span>
                                        <span>₹{order.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-neutral-500 font-bold text-sm px-2">
                                        <span>Delivery Fee</span>
                                        <span className="text-green-500">FREE</span>
                                    </div>
                                    <div className="bg-neutral-900 rounded-3xl p-6 flex justify-between items-center">
                                        <span className="text-neutral-400 font-bold">Amount Paid</span>
                                        <span className="text-2xl font-black text-white tracking-tight">₹{order.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: DELIVERY & SUMMARY */}
                        <div className="space-y-8">
                             {/* CUSTOMER INFO */}
                             <div className="bg-white rounded-[40px] border border-neutral-100 p-8 shadow-xl shadow-rose-100/10">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-neutral-50 pb-4">
                                    Customer
                                </h2>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center text-rose-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Name</p>
                                            <p className="font-bold text-neutral-800">{order.userName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center text-rose-400">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Phone</p>
                                            <p className="font-bold text-neutral-800">{order.phone}</p>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             {/* SHIPPING INFO */}
                             <div className="bg-white rounded-[40px] border border-neutral-100 p-8 shadow-xl shadow-rose-100/10">
                                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-neutral-50 pb-4">
                                    Delivery
                                </h2>
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center text-rose-400 shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Shipping Address</p>
                                        <p className="font-medium text-neutral-700 leading-relaxed text-sm">{order.address}</p>
                                    </div>
                                </div>
                             </div>

                             {/* TIME INFO */}
                             <div className="bg-white rounded-[40px] border border-neutral-100 p-8 shadow-xl shadow-rose-100/10">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center text-rose-400">
                                        <CalendarCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-0.5">Ordered On</p>
                                        <p className="font-bold text-neutral-800">{formattedDate}</p>
                                    </div>
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
