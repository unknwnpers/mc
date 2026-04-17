"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowLeft, Clock, CheckCircle2, Truck, Box, MapPin, Phone, User, Package, CalendarCheck, Clock3, Mail, CreditCard, Banknote, ExternalLink, Hash, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Status Config ──────────────────────────────────────────────────────────────
const statusConfig: any = {
    pending_payment: { label: "Pending Payment", color: "bg-neutral-100 text-neutral-600", icon: Clock, desc: "Awaiting payment confirmation. You can still cancel this order." },
    paid: { label: "Paid", color: "bg-blue-100 text-blue-600", icon: CheckCircle2, desc: "Payment received. We'll start processing your order soon." },
    processing: { label: "Processing", color: "bg-amber-100 text-amber-600", icon: Box, desc: "We are preparing your items for shipment." },
    shipped: { label: "Shipped", color: "bg-indigo-100 text-indigo-600", icon: Truck, desc: "Your order is on its way!" },
    delivered: { label: "Delivered", color: "bg-green-100 text-green-600", icon: CheckCircle2, desc: "Order has been successfully delivered. Hope you love it!" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600", icon: ArrowLeft, desc: "Your order has been cancelled." },
};

// Timeline steps for visual progress tracker (different for COD vs Online)
const ONLINE_STEPS = ["pending_payment", "paid", "processing", "shipped", "delivered"];
const COD_STEPS = ["processing", "shipped", "delivered"];

// Override labels for COD timeline
const codStepLabels: Record<string, string> = {
    processing: "Confirmed",
};

// ── Helper Functions ───────────────────────────────────────────────────────────
const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate && typeof val.toDate === "function") return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    if (typeof val === "string") return new Date(val);
    return null;
};

const formatDt = (val: any, opts: Intl.DateTimeFormatOptions): string => {
    const d = parseDate(val);
    if (!d) return "";
    return d.toLocaleDateString("en-IN", opts);
};

const getOrderDate = (createdAt: any) => formatDt(createdAt, { day: "2-digit", month: "short", year: "numeric" });
const getOrderTime = (createdAt: any) => formatDt(createdAt, { hour: "2-digit", minute: "2-digit", hour12: true });

const getRelativeTime = (createdAt: any) => {
    const d = parseDate(createdAt);
    if (!d) return "";
    const diffMs = Date.now() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `About ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return "";
};

const formatTimelineTime = (val: any): string => {
    const d = parseDate(val);
    if (!d) return "";
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isPayingOnline, setIsPayingOnline] = useState(false);
    
    const orderId = Array.isArray(id) ? id[0] : id;

    useEffect(() => {
        if (user && orderId) {
            fetchOrder();
        } else if (!user && !loading) {
            router.push("/login");
        }
    }, [user, orderId]);

    const fetchOrder = async () => {
        if (!orderId || typeof orderId !== 'string') return;
        try {
            const snap = await getDoc(doc(db, "orders", orderId));
            if (snap.exists()) {
                const data = snap.data();
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

    const handleCancel = async () => {
        if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) return;
        if (!user || !orderId || typeof orderId !== 'string') return;
        
        setIsCancelling(true);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch("/api/order/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (res.ok) {
                if (data.refund) {
                    toast.success(`Order cancelled. Refund of ₹${data.refund.amount} will be processed within 5-7 business days.`);
                } else {
                    toast.success("Order cancelled successfully");
                }
                fetchOrder();
            } else {
                toast.error(data.error || "Failed to cancel order");
            }
        } catch (error) {
            console.error("Cancel Error:", error);
            toast.error("An unexpected error occurred");
        } finally {
            setIsCancelling(false);
        }
    };

    // Load Razorpay script once
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
    }, []);

    const handlePayOnline = async () => {
        if (!user || !orderId || typeof orderId !== 'string') return;
        if (isPayingOnline) return;

        setIsPayingOnline(true);
        try {
            // 1. Create Razorpay order for this COD order
            const idToken = await user.getIdToken();
            const res = await fetch("/api/razorpay/pay-cod", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
                body: JSON.stringify({ orderId }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to initiate payment");
            }

            // 2. Open Razorpay checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: data.amount,
                currency: data.currency,
                name: "Miks & Chiks",
                description: "Pay for your COD order online",
                order_id: data.razorpayOrderId,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch("/api/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
                            body: JSON.stringify(response),
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            toast.success("Payment successful! Your order is now paid online.");
                            fetchOrder(); // Refresh order data
                        } else {
                            throw new Error(verifyData.error || "Payment verification failed");
                        }
                    } catch (vErr: any) {
                        console.error("Verification Error:", vErr);
                        toast.error(vErr.message || "Failed to verify payment");
                    }
                },
                prefill: {
                    name: order.recipient?.name || "",
                    email: order.recipient?.email || order.email || "",
                    contact: order.recipient?.phone || "",
                },
                theme: {
                    color: "#F8AFA6",
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error("Payment failure:", response.error);
                toast.error(response.error.description || "Payment failed. You can try again later.");
            });
            rzp.open();
        } catch (error: any) {
            console.error("Pay Online Error:", error);
            toast.error(error.message || "Failed to initiate online payment");
        } finally {
            setIsPayingOnline(false);
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

    const status = statusConfig[order.status] || statusConfig.pending_payment;
    const StatusIcon = status.icon;
    const orderTimestamp = order.createdAt || order.updatedAt;
    const formattedDate = getOrderDate(orderTimestamp) || "Recently";
    const isCancelled = order.status === "cancelled";
    // Timeline steps: COD shows 3 steps, online shows 5 steps
    // If a COD order was converted to online (isCOD=false but has codPaymentRazorpayOrderId),
    // show online steps starting from "paid" (skip pending_payment)
    const timelineSteps = order.isCOD
        ? COD_STEPS
        : (order.codPaymentRazorpayOrderId ? ["paid", "processing", "shipped", "delivered"] : ONLINE_STEPS);
    const currentStepIndex = timelineSteps.indexOf(order.status);

    // Build timeline map from order.timeline array
    const timelineMap: Record<string, { time: any; note: string }> = {};
    if (order.timeline && Array.isArray(order.timeline)) {
        for (const entry of order.timeline) {
            timelineMap[entry.status] = { time: entry.time, note: entry.note || "" };
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main className="pt-32 pb-24">
                <div className="max-w-7xl mx-auto px-6 md:px-10">
                    <div className="max-w-5xl mx-auto">
                        <Link 
                            href="/orders" 
                            className="inline-flex items-center gap-2 text-neutral-400 hover:text-blush transition-colors mb-10 font-bold text-xs uppercase tracking-widest group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Back to Orders
                        </Link>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2 space-y-12">
                                {/* ── Order Header + Status ─────────────────────── */}
                                <div className="bg-white rounded-[48px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">Order Tracking</p>
                                            <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight">#{order.id.toUpperCase().slice(0, 12)}</h1>
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                                                <span>{formattedDate}</span>
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
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {/* Pay Online button for COD orders (before delivery) */}
                                            {order.isCOD && !["cancelled", "delivered"].includes(order.status) && !order.razorpayPaymentId && (
                                                <button 
                                                    onClick={handlePayOnline}
                                                    disabled={isPayingOnline}
                                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blush text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blush/90 transition-all disabled:opacity-50"
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                    {isPayingOnline ? "Processing..." : "Pay Online"}
                                                </button>
                                            )}
                                            {["pending_payment", "paid", "processing"].includes(order.status) && (
                                                <button 
                                                    onClick={handleCancel}
                                                    disabled={isCancelling}
                                                    className="px-6 py-3 rounded-2xl border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                                                >
                                                    {isCancelling ? "Cancelling..." : "Cancel Order"}
                                                </button>
                                            )}
                                            <div className={cn("inline-flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all", status.color)}>
                                                <StatusIcon className="w-4 h-4" />
                                                {status.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Visual Progress Timeline ────────────── */}
                                    {!isCancelled && (
                                        <div className="mb-8">
                                            {/* Desktop: Horizontal stepper */}
                                            <div className="hidden md:flex items-center justify-between">
                                                {timelineSteps.map((step, idx) => {
                                                    const stepConfig = statusConfig[step];
                                                    const StepIcon = stepConfig?.icon || Clock;
                                                    const isCompleted = currentStepIndex > idx;
                                                    const isCurrent = currentStepIndex === idx;
                                                    const timelineEntry = timelineMap[step];
                                                    
                                                    return (
                                                        <div key={step} className="flex-1 flex flex-col items-center relative">
                                                            {/* Connector line */}
                                                            {idx > 0 && (
                                                                <div className={cn(
                                                                    "absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2",
                                                                    isCompleted || isCurrent ? "bg-blush" : "bg-neutral-200"
                                                                )} />
                                                            )}
                                                            {/* Step circle */}
                                                            <div className={cn(
                                                                "relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                                                                isCompleted ? "bg-blush border-blush text-white" :
                                                                isCurrent ? "bg-white border-blush text-blush shadow-lg shadow-blush/20" :
                                                                "bg-white border-neutral-200 text-neutral-300"
                                                            )}>
                                                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                                                            </div>
                                                            {/* Label */}
                                                            <p className={cn(
                                                                "mt-2 text-[10px] font-bold uppercase tracking-widest text-center",
                                                                isCompleted ? "text-blush" : isCurrent ? "text-charcoal" : "text-neutral-300"
                                                            )}>
                                                                {(order.isCOD && codStepLabels[step]) || stepConfig?.label || step}
                                                            </p>
                                                            {/* Timestamp */}
                                                            {timelineEntry?.time && (isCompleted || isCurrent) && (
                                                                <p className="text-[9px] text-neutral-400 mt-0.5">
                                                                    {formatTimelineTime(timelineEntry.time)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Mobile: Vertical stepper */}
                                            <div className="md:hidden space-y-0">
                                                {timelineSteps.map((step, idx) => {
                                                    const stepConfig = statusConfig[step];
                                                    const StepIcon = stepConfig?.icon || Clock;
                                                    const isCompleted = currentStepIndex > idx;
                                                    const isCurrent = currentStepIndex === idx;
                                                    const timelineEntry = timelineMap[step];
                                                    const isFuture = !isCompleted && !isCurrent;
                                                    
                                                    return (
                                                        <div key={step} className="flex gap-4">
                                                            <div className="flex flex-col items-center">
                                                                <div className={cn(
                                                                    "h-8 w-8 rounded-full flex items-center justify-center border-2 shrink-0",
                                                                    isCompleted ? "bg-blush border-blush text-white" :
                                                                    isCurrent ? "bg-white border-blush text-blush" :
                                                                    "bg-white border-neutral-200 text-neutral-300"
                                                                )}>
                                                                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                                                                </div>
                                                                {idx < timelineSteps.length - 1 && (
                                                                    <div className={cn("w-0.5 h-8", isCompleted ? "bg-blush" : "bg-neutral-200")} />
                                                                )}
                                                            </div>
                                                            <div className="pb-6">
                                                                <p className={cn(
                                                                    "text-xs font-bold uppercase tracking-widest",
                                                                    isCompleted ? "text-blush" : isCurrent ? "text-charcoal" : "text-neutral-300"
                                                                )}>
                                                                    {(order.isCOD && codStepLabels[step]) || stepConfig?.label || step}
                                                                </p>
                                                                {timelineEntry?.time && (isCompleted || isCurrent) && (
                                                                    <p className="text-[10px] text-neutral-400 mt-0.5">{formatTimelineTime(timelineEntry.time)}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Current Status Description ──────────── */}
                                    <div className="p-10 bg-cream/30 rounded-[32px] border border-blush/10 flex items-start gap-8">
                                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 border", isCancelled ? "bg-red-50 text-red-500 border-red-100 shadow-red-100/20" : "bg-white text-blush border-blush/10 shadow-blush/5")}>
                                            <StatusIcon className="w-7 h-7" />
                                        </div>
                                        <div className="pt-1">
                                            <p className="text-xl font-serif font-bold text-charcoal mb-2">{status.label}</p>
                                            <p className="text-neutral-500 font-sans leading-relaxed text-sm">{status.desc}</p>
                                            {/* Tracking info when shipped */}
                                            {(order.status === "shipped" || order.status === "delivered") && (order.trackingNumber || order.courierName) && (
                                                <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                                    {order.courierName && (
                                                        <p className="text-indigo-700 font-bold text-sm">Courier: {order.courierName}</p>
                                                    )}
                                                    {order.trackingNumber && (
                                                        <p className="text-indigo-600 text-xs mt-1 flex items-center gap-1.5">
                                                            <Hash className="w-3 h-3" />
                                                            Tracking: {order.trackingNumber}
                                                        </p>
                                                    )}
                                                    {order.trackingUrl && (
                                                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2 hover:underline">
                                                            Track Package <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {/* Refund Info for cancelled orders */}
                                            {isCancelled && order.refund && (
                                                <div className="mt-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                                                    <p className="text-green-700 font-bold text-sm flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Refund of ₹{order.refund.amount} has been processed
                                                    </p>
                                                    <p className="text-green-600 text-xs mt-1">Refund ID: {order.refund.id}</p>
                                                    <p className="text-green-500 text-xs mt-1">Amount will be credited to your original payment method within 5-7 business days.</p>
                                                </div>
                                            )}
                                            {isCancelled && order.isCOD && !order.refund && (
                                                <div className="mt-4 p-4 bg-neutral-100 rounded-2xl border border-neutral-200">
                                                    <p className="text-neutral-600 font-medium text-sm">Since this was a Cash on Delivery order, no refund is applicable.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Items In Parcel ───────────────────────────── */}
                                <div className="bg-white rounded-[48px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                    <h2 className="text-2xl font-serif font-bold text-charcoal mb-10 flex items-center gap-4">
                                        <Package className="w-6 h-6 text-blush" />
                                        Items In Parcel <span className="text-neutral-300 font-sans text-lg font-medium">({order.items.length})</span>
                                    </h2>
                                    
                                    <div className="space-y-8">
                                        {order.items.map((item: any, i: number) => {
                                            let displaySize = item.selectedSize;
                                            if (displaySize) {
                                                const skuMatch = displaySize.match(/^.*-(\d{2,})(Y)$/);
                                                if (skuMatch) {
                                                    const num = skuMatch[1];
                                                    if (num.length >= 2 && !displaySize.includes('-', displaySize.lastIndexOf('-') + 1)) {
                                                        displaySize = `${num[0]}-${num.slice(1)}Y`;
                                                    } else {
                                                        displaySize = `${num}Y`;
                                                    }
                                                }
                                            }
                                            
                                            return (
                                            <div key={i} className="flex gap-8 items-center group">
                                                <div className="h-24 w-24 bg-cream rounded-3xl overflow-hidden border border-[#F3E8E5] shrink-0">
                                                    <img 
                                                        src={item.image || '/placeholder.svg'} 
                                                        alt={item.name}
                                                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-serif font-bold text-xl text-charcoal mb-0.5 truncate">{item.name}</p>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Qty: {item.quantity}</p>
                                                        {displaySize && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                                                <p className="text-[10px] text-blush font-bold uppercase tracking-widest">Size: {displaySize}</p>
                                                            </>
                                                        )}
                                                        {item.sku && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                                                <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-widest">SKU: {item.sku}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-serif font-bold text-xl text-charcoal">₹{item.price * item.quantity}</p>
                                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">₹{item.price} x {item.quantity}</p>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── Payment Breakdown ────────────────────── */}
                                    <div className="mt-12 pt-12 border-t border-[#F3E8E5] space-y-5">
                                        <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                            <span>Subtotal</span>
                                            <span className="font-serif text-lg text-charcoal">₹{order.subtotal || order.total}</span>
                                        </div>
                                        {order.discount > 0 && (
                                            <div className="flex justify-between items-center text-green-600 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>Discount</span>
                                                <span className="font-serif text-lg">-₹{order.discount}</span>
                                            </div>
                                        )}
                                        {order.paymentBreakdown?.shipping !== undefined && (
                                            <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>Shipping</span>
                                                <span className={order.paymentBreakdown.shipping === 0 ? "text-green-600 font-bold" : "font-serif text-lg text-charcoal"}>
                                                    {order.paymentBreakdown.shipping === 0 ? "FREE" : `₹${order.paymentBreakdown.shipping}`}
                                                </span>
                                            </div>
                                        )}
                                        {order.paymentBreakdown?.handlingFee > 0 && (
                                            <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>Handling Fee</span>
                                                <span className="font-serif text-lg text-charcoal">₹{order.paymentBreakdown.handlingFee}</span>
                                            </div>
                                        )}
                                        {order.paymentBreakdown?.gst?.total > 0 && (
                                            <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>GST ({order.paymentBreakdown.gst.rate || '18%'})</span>
                                                <span className="font-serif text-lg text-charcoal">₹{order.paymentBreakdown.gst.total}</span>
                                            </div>
                                        )}
                                        {order.paymentBreakdown?.codCharge > 0 && (
                                            <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>COD Charges</span>
                                                <span className="font-serif text-lg text-charcoal">₹{order.paymentBreakdown.codCharge}</span>
                                            </div>
                                        )}
                                        {!order.paymentBreakdown && (
                                            <div className="flex justify-between items-center text-charcoal/60 font-bold text-xs uppercase tracking-widest px-4">
                                                <span>Delivery</span>
                                                <span className="text-green-600 font-bold">FREE</span>
                                            </div>
                                        )}
                                        <div className="bg-charcoal rounded-[32px] p-8 flex justify-between items-center shadow-2xl shadow-charcoal/20">
                                            <span className="text-neutral-400 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                                            <span className="text-3xl font-serif font-bold text-white tracking-tight">₹{order.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Sidebar ──────────────────────────────────── */}
                            <div className="space-y-12">
                                {/* Recipient */}
                                <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-[#F3E8E5] pb-6">
                                        Recipient
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Name</p>
                                                <p className="font-serif font-bold text-lg text-charcoal">
                                                    {order.recipient?.name || order.customerName || order.userName || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                                <Phone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Phone</p>
                                                <p className="font-serif font-bold text-lg text-charcoal">
                                                    {order.recipient?.phone || order.phoneNumber || order.phone || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        {(order.recipient?.email || order.email) && (
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Email</p>
                                                    <p className="font-sans font-medium text-charcoal text-sm break-all">
                                                        {order.recipient?.email || order.email}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-5">
                                            <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10">
                                                {order.isCOD ? <Banknote className="w-5 h-5" /> : order.codPaymentRazorpayOrderId ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Payment</p>
                                                <p className="font-serif font-bold text-lg text-charcoal">
                                                    {order.isCOD ? "Cash on Delivery" : order.codPaymentRazorpayOrderId ? "Paid Online" : "Online Payment"}
                                                </p>
                                                {!order.isCOD && order.codPaymentRazorpayOrderId && (
                                                    <p className="text-[9px] text-blush font-bold uppercase tracking-wider mt-0.5">Converted from COD</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping */}
                                <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-10 shadow-xl shadow-blush/5">
                                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-8 border-b border-[#F3E8E5] pb-6">
                                        Shipping
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="flex gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 shrink-0">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Delivery Address</p>
                                                <p className="font-sans font-medium text-charcoal/80 leading-relaxed text-sm">
                                                    {order.recipient?.address?.addressLine1 || order.shipping?.address || order.shippingAddress || order.address}
                                                    {order.recipient?.address?.addressLine2 && `, ${order.recipient.address.addressLine2}`}
                                                </p>
                                                <p className="font-sans font-medium text-charcoal/80 leading-relaxed text-sm">
                                                    {order.recipient?.address?.city || order.shipping?.city}
                                                    {order.recipient?.address?.state && `, ${order.recipient.address.state}`}
                                                    {order.recipient?.address?.pincode && ` - ${order.recipient.address.pincode}`}
                                                    {!order.recipient?.address?.city && order.shipping?.city && `, ${order.shipping.city}`}
                                                    {!order.recipient?.address?.pincode && order.shipping?.pincode && ` - ${order.shipping.pincode}`}
                                                </p>
                                                {order.recipient?.address?.landmark && (
                                                    <p className="text-[10px] text-neutral-400 mt-1">Near {order.recipient.address.landmark}</p>
                                                )}
                                            </div>
                                        </div>
                                        {!isCancelled && (
                                            <div className="flex gap-6">
                                                <div className="h-12 w-12 rounded-2xl bg-cream flex items-center justify-center text-blush border border-blush/10 shrink-0">
                                                    <Truck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Estimated Delivery</p>
                                                    <p className="font-sans font-medium text-charcoal/80 text-sm">
                                                        {order.status === "shipped" ? "2-4 business days" : "3-7 business days"}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Date & Time */}
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

                                {/* Need Help */}
                                <div className="p-8 bg-cream/10 rounded-[40px] border border-dashed border-blush/20 text-center">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Need Help?</p>
                                    <p className="text-xs text-charcoal/60 leading-relaxed px-4">
                                        Our customer experience team is here for you.
                                    </p>
                                    <a href="mailto:support@miksandchiks.com" className="inline-block mt-4 text-xs font-bold text-blush hover:underline uppercase tracking-widest">Email Support</a>
                                    <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs font-bold text-green-600 hover:underline uppercase tracking-widest">WhatsApp Us</a>
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
