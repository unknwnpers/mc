"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, ChevronRight, Clock, CheckCircle2, Truck, Box, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusConfig: any = {
    created: { label: "Order Placed", color: "bg-neutral-100 text-neutral-600", icon: Clock },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box },
    shipped: { label: "Shipped", color: "bg-blue-100 text-blue-600", icon: Truck },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2 },
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
                orderBy("updatedAt", "desc")
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

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-rose-100/20 border border-rose-50">
                            <ShoppingBag className="w-8 h-8 text-rose-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-neutral-900 tracking-tight">Orders</h1>
                            <p className="text-neutral-500 font-medium">Your shopping history & tracking</p>
                        </div>
                    </div>

                    {user && orders.length > 0 && (
                        <div className="flex gap-4">
                            <div className="bg-white px-6 py-4 rounded-2xl border border-neutral-100 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Total Spent</p>
                                <p className="text-xl font-black text-neutral-900">₹{totalSpent}</p>
                            </div>
                            <div className="bg-neutral-900 px-6 py-4 rounded-2xl shadow-xl shadow-neutral-200">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Orders</p>
                                <p className="text-xl font-black text-white">{totalOrders}</p>
                            </div>
                        </div>
                    )}
                </div>

                {!user ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-rose-100/10">
                        <h2 className="text-2xl font-bold text-neutral-800 mb-4">Account Required</h2>
                        <p className="text-neutral-500 mb-8">Please login to view your order history and track shipments.</p>
                        <Link href="/login" className="bg-rose-400 text-white px-10 py-4 rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl active:scale-95 inline-block">
                            Login to Account
                        </Link>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-[40px] border border-neutral-100 shadow-xl shadow-rose-100/10">
                        <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-8 text-neutral-300">
                            <Package className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-black text-neutral-800 mb-2">No orders found</h2>
                        <p className="text-neutral-500 mb-10 max-w-xs mx-auto font-medium">Looks like you haven't placed any orders yet. Start shopping to fill this space!</p>
                        <Link href="/" className="inline-block bg-neutral-900 text-white px-12 py-5 rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl active:scale-95">
                            Browse Collections
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {orders.map((order) => {
                            const status = statusConfig[order.status] || statusConfig.created;
                            const StatusIcon = status.icon;

                            return (
                                <div key={order.id} className="group bg-white rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-2xl hover:shadow-rose-100/20 transition-all duration-500 overflow-hidden">
                                    <div className="p-8 flex flex-col md:flex-row gap-8 md:items-center justify-between border-b border-neutral-50">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Order Ref</p>
                                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                                                <p className="font-mono text-neutral-500 text-xs">#{order.id.slice(0, 8)}</p>
                                            </div>
                                            <p className="text-xl font-black text-neutral-900">₹{order.total}</p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest", status.color)}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {status.label}
                                            </div>
                                            <Link 
                                                href={`/orders/${order.id}`}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-neutral-50 text-neutral-900 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-900 hover:text-white transition-all group/btn"
                                            >
                                                View Details
                                                <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* ITEMS PREVIEW */}
                                            <div className="flex-1">
                                                <div className="flex -space-x-4 mb-4">
                                                    {order.items.slice(0, 4).map((item: any, i: number) => (
                                                        <div key={i} className="h-14 w-14 rounded-2xl border-4 border-white bg-neutral-50 overflow-hidden shadow-lg shadow-neutral-200/50">
                                                            <img src={item.image} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    {order.items.length > 4 && (
                                                        <div className="h-14 w-14 rounded-2xl border-4 border-white bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold text-xs shadow-lg">
                                                            +{order.items.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm font-bold text-neutral-800">
                                                    {order.items[0]?.name} {order.items.length > 1 && `& ${order.items.length - 1} more items`}
                                                </p>
                                            </div>

                                            {/* SHIPPING PREVIEW */}
                                            <div className="lg:w-72 bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100 flex items-start gap-4">
                                                <div className="h-10 w-10 shrink-0 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-100">
                                                    <Truck className="w-5 h-5 text-neutral-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Delivering to</p>
                                                    <p className="text-xs font-bold text-neutral-700 truncate">{order.address}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}