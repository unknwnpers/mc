"use client";

import { useCart } from "@/context/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createOrder } from "@/lib/order";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { User, MapPin, Phone, Info } from "lucide-react";
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

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-rose-400 border-r-transparent"></div>
                    <p className="mt-4 text-neutral-600 font-medium">Loading your selection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
                <div className="flex items-center justify-between mb-12">
                    <h1 className="text-4xl font-bold text-neutral-900">Your Cart</h1>
                    {cart.length > 0 && (
                        <button 
                            onClick={() => {
                                clearCart();
                                toast.success("Cart cleared");
                            }}
                            className="text-neutral-400 hover:text-red-500 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Clear All
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-neutral-100 shadow-xl shadow-rose-100/20">
                        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <ShoppingCart className="w-10 h-10 text-rose-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-neutral-800 mb-3">Your cart is empty</h2>
                        <p className="text-neutral-500 mb-10 max-w-sm mx-auto text-lg">
                            Looks like you haven't added anything to your cart yet. Trendy collections are waiting for you!
                        </p>
                        <Link href="/" className="inline-flex items-center gap-2 bg-neutral-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-neutral-200 active:scale-95">
                            Start Shopping
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                        {/* ITEMS LIST */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-4">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-6 items-center bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* ... (item content) */}
                                        <div className="w-28 h-28 bg-neutral-50 rounded-2xl overflow-hidden shrink-0">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-xl text-neutral-800 mb-1 truncate">
                                                {item.name}
                                            </h3>
                                            <p className="text-rose-500 font-bold text-lg mb-4">
                                                ₹{item.price}
                                            </p>

                                            <div className="flex items-center gap-1 bg-neutral-50 w-fit p-1 rounded-xl border border-neutral-100">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            Math.max(1, item.quantity - 1)
                                                        )
                                                    }
                                                    className="p-2 hover:bg-white hover:text-rose-50 rounded-lg transition-all"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>

                                                <span className="w-10 text-center font-bold text-neutral-700">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    onClick={() =>
                                                        updateQuantity(item.id, item.quantity + 1)
                                                    }
                                                    className="p-2 hover:bg-white hover:text-rose-500 rounded-lg transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-4">
                                            <p className="font-black text-xl text-neutral-900">
                                                ₹{item.price * item.quantity}
                                            </p>
                                            <button
                                                onClick={() => {
                                                    removeFromCart(item.id);
                                                    toast.error(`${item.name} removed`);
                                                }}
                                                className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl shadow-rose-100/20 sticky top-32">
                            <h2 className="text-2xl font-bold text-neutral-800 mb-6">
                                Order Summary
                            </h2>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-neutral-500">
                                    <span>Subtotal</span>
                                    <span>₹{total}</span>
                                </div>
                                <div className="flex justify-between text-neutral-500">
                                    <span>Shipping</span>
                                    <span className="text-green-500 font-medium">Free</span>
                                </div>
                                <div className="h-px bg-neutral-100 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-neutral-800">Total</span>
                                    <span className="text-3xl font-black text-rose-500">₹{total}</span>
                                </div>
                            </div>

                            {(!profile?.address || !profile?.phone) && user && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-amber-800 font-bold mb-1">Incomplete Profile</p>
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            Please add your delivery address and phone number to checkout.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={isCheckingOut}
                                onClick={async () => {
                                    if (!user) {
                                        toast.info("Please login to checkout");
                                        router.push("/login");
                                        return;
                                    }

                                    setIsCheckingOut(true);
                                    try {
                                        // Final Stock Check
                                        for (const item of cart) {
                                            const productSnap = await getDoc(doc(db, "products", item.id));
                                            if (!productSnap.exists()) {
                                                toast.error(`${item.name} is no longer available`);
                                                setIsCheckingOut(false);
                                                return;
                                            }
                                            const stock = productSnap.data().stock || 0;
                                            if (item.quantity > stock) {
                                                toast.error(`Only ${stock} units of ${item.name} left`);
                                                setIsCheckingOut(false);
                                                return;
                                            }
                                        }

                                        const OrderId = await createOrder(user.uid, cart);
                                        toast.success('Order placed successfully!');
                                        clearCart();
                                        router.push('/orders');
                                    } catch (err: any) {
                                        if (err.message === "Incomplete profile") {
                                            toast.error("Please complete your delivery profile first");
                                            router.push("/profile");
                                        } else {
                                            toast.error("Failed to place order. Please try again.");
                                        }
                                    } finally {
                                        setIsCheckingOut(false);
                                    }
                                }}
                                className="w-full bg-rose-400 text-white py-4 rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-rose-200/50 flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-95"
                            >
                                {isCheckingOut ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
                                ) : (
                                    <>
                                        {(!profile?.address || !profile?.phone) ? "Complete Profile to Checkout" : "Proceed to Checkout"}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            
                            <p className="text-center text-xs text-neutral-400 mt-6 uppercase tracking-widest font-bold">
                                Secure Checkout Powered by Razorpay
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}