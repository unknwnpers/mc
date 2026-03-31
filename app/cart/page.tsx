"use client";

import { useCart } from "@/context/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { User, MapPin, Phone, Info, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, clearCart, loading } = useCart();
    const { user, profile } = useAuth();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    useEffect(() => {
        // One-time script loading for optimized performance
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        
        return () => {
            // Cleanup NOT recommended here because checkout should persist
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blush border-r-transparent"></div>
                    <p className="mt-4 text-neutral-600 font-sans font-medium">Loading your selection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 md:px-10 py-32">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-5xl font-serif font-bold text-charcoal tracking-tight">Your <span className="text-blush italic">Cart</span></h1>
                    {cart.length > 0 && (
                        <button 
                            onClick={() => {
                                clearCart();
                                toast.success("Cart cleared");
                            }}
                            className="text-neutral-400 hover:text-blush transition-colors text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-32 bg-cream/30 rounded-[60px] border border-dashed border-blush/20">
                        <div className="w-24 h-24 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm border border-blush/10">
                            <ShoppingCart className="w-10 h-10 text-blush" />
                        </div>
                        <h2 className="text-4xl font-serif font-bold text-charcoal mb-4">Your cart is empty</h2>
                        <p className="text-gray-500 mb-12 max-w-sm mx-auto text-lg font-sans">
                            Looks like you haven't added anything to your cart yet. Trendy collections are waiting for you!
                        </p>
                        <Link href="/" className="inline-flex items-center gap-3 bg-charcoal text-white px-12 py-5 rounded-2xl font-bold hover:bg-blush transition-all shadow-2xl shadow-charcoal/10 active:scale-95 transform hover:-translate-y-1">
                            Start Shopping
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                        {/* ITEMS LIST */}
                        <div className="lg:col-span-2 space-y-10">
                            <div className="space-y-6">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-8 items-center bg-white p-6 rounded-[40px] border border-[#F3E8E5] shadow-sm hover:shadow-xl hover:shadow-blush/5 transition-all duration-500 group"
                                    >
                                        <div className="w-32 h-32 bg-cream rounded-[32px] overflow-hidden shrink-0 border border-[#F3E8E5]">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-serif font-bold text-2xl text-charcoal mb-0.5 truncate">
                                                {item.name}
                                            </h3>
                                            {item.selectedSize && (
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">
                                                    Size: {item.selectedSize}
                                                </p>
                                            )}
                                            <p className="text-blush font-bold text-xl mb-4">
                                                ₹{item.price}
                                            </p>

                                            <div className="flex items-center gap-2 bg-cream width-fit p-1 rounded-2xl border border-blush/10 w-fit">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            Math.max(1, item.quantity - 1),
                                                            item.selectedSize
                                                        )
                                                    }
                                                    className="p-2.5 hover:bg-white hover:text-blush rounded-xl transition-all shadow-sm active:scale-90"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>

                                                <span className="w-12 text-center font-bold text-charcoal font-sans">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    onClick={() =>
                                                        updateQuantity(item.id, item.quantity + 1, item.selectedSize)
                                                    }
                                                    className="p-2.5 hover:bg-white hover:text-blush rounded-xl transition-all shadow-sm active:scale-90"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-6 pr-4">
                                            <p className="font-serif font-bold text-2xl text-charcoal">
                                                ₹{item.price * item.quantity}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    removeFromCart(item.id, item.selectedSize);
                                                    toast.error(`${item.name} removed`);
                                                }}
                                                className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm active:scale-90"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="bg-white p-10 rounded-[48px] border border-[#F3E8E5] shadow-2xl shadow-blush/5 sticky top-32">
                            <h2 className="text-3xl font-serif font-bold text-charcoal mb-8">
                                Order <span className="text-blush italic">Summary</span>
                            </h2>

                            <div className="space-y-5 mb-10">
                                <div className="flex justify-between text-charcoal/60 font-medium">
                                    <span>Subtotal</span>
                                    <span>₹{total}</span>
                                </div>
                                <div className="flex justify-between text-charcoal/60 font-medium">
                                    <span>Shipping</span>
                                    <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest pt-1">Free</span>
                                </div>
                                <div className="h-px bg-[#F3E8E5] my-2" />
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xl font-bold text-charcoal">Total</span>
                                    <span className="text-4xl font-serif font-bold text-blush tracking-tight">₹{total}</span>
                                </div>
                            </div>

                            {(!profile?.address || !profile?.phone) && user && (
                                <div className="mb-8 p-6 bg-cream/50 rounded-3xl border border-blush/10 flex items-start gap-4">
                                    <Info className="w-6 h-6 text-blush shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Delivery Profile</p>
                                        <p className="text-sm text-charcoal/60 leading-relaxed font-sans">
                                            Please add your address and phone number to proceed with checkout.
                                        </p>
                                    </div>
                                </div>
                            )}

                             <button
                                onClick={async () => {
                                    if (!user) {
                                        toast.info("Please login to checkout");
                                        router.push("/login?redirect=/cart");
                                        return;
                                    }

                                    if (!profile?.address || !profile?.phone) {
                                        toast.warning("Please complete your delivery profile first");
                                        router.push("/profile?redirect=/cart");
                                        return;
                                    }

                                    setIsCheckingOut(true);
                                    try {
                                        // 1. Create Server-Validated Razorpay Order
                                        const res = await fetch("/api/razorpay/order", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ cart, userId: user.uid, profile }),
                                        });

                                        const data = await res.json();
                                        if (!res.ok) {
                                            if (data.type === "INVENTORY_ERROR") {
                                                toast.error(data.error || "Some items are no longer available.");
                                                return;
                                            }
                                            throw new Error(data.error || "Order creation failed");
                                        }

                                        // 2. Handle Bypass/Mock Mode
                                        if (data.isMock) {
                                            toast.success("Test Mode: Order placed successfully!");
                                            router.push("/orders");
                                            clearCart();
                                            return;
                                        }

                                        // 3. Open Razorpay Checkout Modal (Live Mode)
                                        const options = {
                                            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                                            amount: data.amount,
                                            currency: data.currency,
                                            name: "Miks & Chiks",
                                            description: "Premium Maternity & Kids Wear",
                                            order_id: data.orderId,
                                            handler: async function (response: any) {
                                                setIsCheckingOut(true);
                                                try {
                                                    const verifyRes = await fetch("/api/razorpay/verify", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(response),
                                                    });

                                                    const verifyData = await verifyRes.json();
                                                    if (verifyData.success) {
                                                        toast.success("Payment verified! Your order is confirmed.");
                                                        clearCart();
                                                        router.push(`/orders/${verifyData.firestoreOrderId}`);
                                                    } else {
                                                        throw new Error(verifyData.error || "Payment verification failed");
                                                    }
                                                } catch (vErr: any) {
                                                    console.error("Verification Error:", vErr);
                                                    toast.error(vErr.message || "Failed to verify payment");
                                                } finally {
                                                    setIsCheckingOut(false);
                                                }
                                            },
                                            prefill: {
                                                name: profile.name,
                                                email: user.email,
                                                contact: profile.phone,
                                            },
                                            theme: {
                                                color: "#F8AFA6", // Blush color
                                            },
                                        };

                                            const rzp = new (window as any).Razorpay(options);
                                            
                                            // 4. Bulletproof Failure/Abandonment Recovery
                                            rzp.on('payment.failed', async function (response: any) {
                                                console.error("Payment failure:", response.error);
                                                setIsCheckingOut(true);
                                                try {
                                                    // Immediately release stock if payment fails
                                                    await fetch("/api/razorpay/cancel", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            reservationId:   data.reservationId,
                                                            razorpayOrderId: data.orderId,
                                                        }),
                                                    });
                                                    toast.error("Payment failed. Your cart is restored.");
                                                } finally {
                                                    setIsCheckingOut(false);
                                                }
                                            });
                                            
                                            rzp.open();

                                    } catch (err: any) {
                                        console.error("Checkout Error:", err);
                                        toast.error(err.message || "Failed to initiate checkout");
                                    } finally {
                                        setIsCheckingOut(false);
                                    }
                                }}
                                disabled={isCheckingOut}
                                className="w-full bg-blush text-white py-6 rounded-3xl font-bold text-lg hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/20 flex items-center justify-center gap-3 group disabled:opacity-50 active:scale-95 transform hover:-translate-y-1"
                            >
                                {isCheckingOut ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-solid border-white border-r-transparent" />
                                ) : (
                                    <>
                                        {(!profile?.address || !profile?.phone) ? "Complete Profile" : "Secure Checkout"}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </>
                                )}
                            </button>
                            
                            <p className="text-center text-[10px] text-gray-400 mt-8 uppercase tracking-[0.2em] font-bold">
                                Protected by Razorpay Secure
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Footer />

        </div>
    );
}