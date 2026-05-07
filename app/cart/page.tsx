"use client";

import { useCart, CartItem } from "@/context/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ApplyCoupon } from "@/components/ApplyCoupon";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
    ShoppingCart, Trash2, Plus, Minus, ArrowRight, Check,
    PlusCircle, Truck, Package, CreditCard, HelpCircle,
    Shield, RefreshCw, Headphones, AlertCircle, Info, MapPin,
    Loader2, Tag, ChevronRight, Lock
} from "lucide-react";

const MIN_ORDER_VALUE = 200;
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { apiFetch, ensureAppCheckReady } from "@/lib/firebase";
import { SavedAddress } from "@/lib/types";
import { PaymentBreakdown } from "@/lib/payment-calculator";
import { cn } from "@/lib/utils";

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, clearCart, loading } = useCart();
    const { user, profile } = useAuth();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressesLoading, setAddressesLoading] = useState(true);
    const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
    const [isCOD, setIsCOD] = useState(false);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    const [couponCode, setCouponCode] = useState<string | null>(null);

    // Pre-warm App Check token
    useEffect(() => {
        ensureAppCheckReady().catch(() => {});
    }, []);

    const totalSellingPrice = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const totalMRP = cart.reduce(
        (sum, item) => sum + (item.mrp || item.price) * item.quantity,
        0
    );

    // Computed state: Check if we have a complete delivery address
    const hasCompleteAddress = (() => {
        if (selectedAddressId && addresses.length > 0) {
            const selectedAddr = addresses.find(a => a.id === selectedAddressId);
            if (selectedAddr && selectedAddr.addressLine1 && selectedAddr.city && selectedAddr.pincode && selectedAddr.phone) {
                return true;
            }
        }
        return !!(profile?.addressLine1 && profile?.city && profile?.pincode && profile?.phone && profile?.email && profile?.name);
    })();

    const getDeliveryProfile = () => {
        if (selectedAddressId && addresses.length > 0) {
            const selectedAddr = addresses.find(a => a.id === selectedAddressId);
            if (selectedAddr) {
                return {
                    ...profile,
                    uid: profile?.uid || user?.uid,
                    name: selectedAddr.name,
                    phone: selectedAddr.phone,
                    addressLine1: selectedAddr.addressLine1,
                    addressLine2: selectedAddr.addressLine2 || "",
                    landmark: selectedAddr.landmark || "",
                    city: selectedAddr.city,
                    state: selectedAddr.state,
                    pincode: selectedAddr.pincode,
                };
            }
        }
        return profile;
    };

    // Fetch payment breakdown from server
    useEffect(() => {
        const fetchBreakdown = async () => {
            if (!user || cart.length === 0) {
                setPaymentBreakdown(null);
                return;
            }
            
            setBreakdownLoading(true);
            try {
                const token = await user.getIdToken();
                const res = await fetch("/api/cart/calculate", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        couponDiscount,
                        isCOD,
                    }),
                });
                
                const data = await res.json();
                if (data.success) {
                    setPaymentBreakdown(data.data);
                    setFinalAmount(data.data.totalAmount);
                }
            } catch (err) {
                console.error("Error fetching payment breakdown:", err);
                setFinalAmount(totalSellingPrice - couponDiscount);
            } finally {
                setBreakdownLoading(false);
            }
        };

        fetchBreakdown();
    }, [totalSellingPrice, couponDiscount, isCOD, user, cart.length]);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
    }, []);

    // Fetch saved addresses
    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) {
                setAddressesLoading(false);
                return;
            }
            setAddressesLoading(true);
            try {
                const token = await user.getIdToken();
                const res = await fetch("/api/user/addresses", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    const addr = data.addresses || [];
                    setAddresses(addr);
                    const defaultAddr = addr.find((a: SavedAddress) => a.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr.id);
                    } else if (addr.length > 0) {
                        setSelectedAddressId(addr[0].id);
                    }
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
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blush border-r-transparent"></div>
                    <p className="mt-4 text-neutral-600 font-sans font-medium">Loading your selection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBFB]">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 md:px-10 pt-28 pb-32">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight">
                            Your <span className="text-blush italic">Cart</span>
                        </h1>
                        <div className="flex items-center gap-4 mt-3 text-neutral-400 text-xs font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure Checkout</span>
                            <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                            <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Easy Returns</span>
                            <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                            <span className="flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" /> 24/7 Support</span>
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button 
                            onClick={() => {
                                if (confirm("Remove all items from your cart?")) {
                                    clearCart();
                                    toast.success("Cart cleared");
                                }
                            }}
                            className="self-start md:self-auto text-neutral-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-100 shadow-sm"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear Cart
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[60px] border border-dashed border-blush/20 shadow-sm">
                        <div className="w-24 h-24 bg-cream rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm border border-blush/10">
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
                    <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 lg:gap-12 items-start">
                        {/* LEFT: CART ITEMS (70%) */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="bg-white rounded-[40px] border border-[#F3E8E5] shadow-sm overflow-hidden">
                                {cart.map((item, index) => (
                                    <div
                                        key={`${item.id}-${item.sku}`}
                                        className={cn(
                                            "flex gap-6 p-6 sm:p-8 hover:bg-[#FFFAFA]/50 transition-all duration-500 group",
                                            index !== cart.length - 1 && "border-b border-[#F3E8E5]"
                                        )}
                                    >
                                        {/* Product Image */}
                                        <div className="w-28 h-28 sm:w-40 sm:h-40 bg-cream rounded-[32px] overflow-hidden shrink-0 border border-[#F3E8E5] relative">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <div className="space-y-1">
                                                <div className="flex items-start justify-between gap-4">
                                                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-charcoal leading-tight">
                                                        {item.name}
                                                    </h3>
                                                    <button
                                                        onClick={() => removeFromCart(item.id, item.sku)}
                                                        className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 shrink-0"
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest">
                                                    <span>Size: <span className="text-charcoal">{item.selectedSize}</span></span>
                                                    <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                                                    <span>Color: <span className="text-charcoal">Teal</span></span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-blush font-bold text-2xl sm:text-3xl">₹{item.price}</span>
                                                        {item.mrp && item.mrp > item.price && (
                                                            <span className="text-neutral-300 line-through text-sm font-medium">₹{item.mrp}</span>
                                                        )}
                                                        {item.mrp && item.mrp > item.price && (
                                                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                                                                {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 p-1 bg-[#FDFBFB] border border-[#F3E8E5] rounded-2xl w-fit">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.sku)}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-200 rounded-xl hover:border-blush hover:text-blush transition-all active:scale-90 disabled:opacity-40 shadow-sm"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-10 text-center font-bold text-charcoal font-sans">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.sku)}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-neutral-200 rounded-xl hover:border-blush hover:text-blush transition-all active:scale-90 shadow-sm"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Trust Signals Under Cart */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { icon: Shield, title: "Secure Payment", desc: "100% safe & secure", color: "text-green-600", bg: "bg-green-50" },
                                    { icon: RefreshCw, title: "Easy Returns", desc: "Hassle-free returns", color: "text-blue-600", bg: "bg-blue-50" },
                                    { icon: Truck, title: "Fast Delivery", desc: "Across India", color: "text-amber-600", bg: "bg-amber-50" },
                                    { icon: Headphones, title: "24/7 Support", desc: "We're here to help", color: "text-purple-600", bg: "bg-purple-50" },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white p-5 rounded-3xl border border-[#F3E8E5] shadow-sm flex flex-col items-center text-center">
                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", s.bg, s.color)}>
                                            <s.icon className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-bold text-charcoal mb-0.5">{s.title}</p>
                                        <p className="text-[10px] text-neutral-400 font-medium">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: ORDER SUMMARY (30%) */}
                        <div className="lg:col-span-4 space-y-6 sticky top-28">
                            <div className="bg-white p-8 md:p-10 rounded-[40px] border border-[#F3E8E5] shadow-xl shadow-blush/5">
                                <h2 className="text-3xl font-serif font-bold text-charcoal mb-8">
                                    Order <span className="text-blush italic">Summary</span>
                                </h2>

                                <div className="space-y-5 mb-8 text-sm">
                                    {/* Subtotal */}
                                    <div className="flex justify-between text-neutral-500 font-medium">
                                        <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                                        <span className="text-charcoal font-bold">₹{paymentBreakdown?.mrpTotal ?? totalMRP}</span>
                                    </div>

                                    {/* Discount */}
                                    {(paymentBreakdown?.productDiscount || (totalMRP - totalSellingPrice)) > 0 && (
                                        <div className="flex justify-between text-green-600 font-bold">
                                            <div className="flex items-center gap-1">
                                                <span>Discount</span>
                                                {paymentBreakdown && (
                                                    <span className="text-[10px] bg-green-50 px-1.5 py-0.5 rounded-md border border-green-100 ml-1">
                                                        {Math.round((paymentBreakdown.productDiscount / paymentBreakdown.mrpTotal) * 100)}% OFF
                                                    </span>
                                                )}
                                            </div>
                                            <span>-₹{paymentBreakdown?.productDiscount ?? (totalMRP - totalSellingPrice)}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-neutral-100" />

                                    {/* Subtotal After Discount */}
                                    <div className="flex justify-between text-charcoal font-bold">
                                        <span>Subtotal After Discount</span>
                                        <span>₹{paymentBreakdown?.subtotal ?? totalSellingPrice}</span>
                                    </div>

                                    {/* Convenience Fee */}
                                    <div className="flex justify-between text-neutral-500 font-medium">
                                        <div className="flex items-center gap-1">
                                            <span>Convenience Fee</span>
                                            <HelpCircle className="w-3.5 h-3.5 text-neutral-300" />
                                        </div>
                                        <span className="text-charcoal font-bold">
                                            {breakdownLoading ? "..." : `₹${paymentBreakdown?.convenienceFee ?? (isCOD ? 11 : 8)}`}
                                        </span>
                                    </div>

                                    {/* COD Charges */}
                                    {isCOD && (
                                        <div className="flex justify-between text-neutral-500 font-medium">
                                            <span>COD Charges</span>
                                            <span className="text-charcoal font-bold">₹{paymentBreakdown?.codCharge ?? 30}</span>
                                        </div>
                                    )}

                                    {/* Shipping */}
                                    <div className="flex justify-between text-neutral-500 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Truck className="w-4 h-4" />
                                            <span>Shipping</span>
                                        </div>
                                        <span className="text-green-600 font-bold uppercase tracking-widest text-xs">FREE</span>
                                    </div>

                                    <div className="pt-4 border-t-2 border-dashed border-neutral-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xl font-bold text-charcoal">Total Amount</span>
                                            <span className="text-4xl font-serif font-bold text-blush tracking-tight">
                                                ₹{breakdownLoading ? "..." : (finalAmount || totalSellingPrice)}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-neutral-400 text-right font-medium uppercase tracking-widest">
                                            Inclusive of all taxes
                                        </p>
                                    </div>
                                </div>

                                {/* Savings Highlight */}
                                {((paymentBreakdown?.totalSavings ?? 0) > 0) && (
                                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <Tag className="w-4 h-4 text-green-600" />
                                        </div>
                                        <p className="text-sm font-bold text-green-700">
                                            You saved ₹{paymentBreakdown?.totalSavings} on this order
                                        </p>
                                    </div>
                                )}

                                {/* Coupon Section */}
                                <div className="mb-8 p-6 bg-[#FDFBFB] border border-[#F3E8E5] rounded-3xl">
                                    <ApplyCoupon
                                        orderAmount={totalSellingPrice}
                                        onCouponApplied={(discountAmt, _final, couponData) => {
                                            setCouponDiscount(discountAmt);
                                            setCouponCode(couponData?.code || null);
                                        }}
                                        onCouponRemoved={() => {
                                            setCouponDiscount(0);
                                            setCouponCode(null);
                                        }}
                                    />
                                </div>

                                {/* Payment Method */}
                                <div className="mb-8">
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Payment Method</p>
                                    <div className="space-y-3">
                                        {/* Online Payment */}
                                        <label className={cn(
                                            "block p-4 rounded-2xl cursor-pointer transition-all border-2",
                                            !isCOD ? 'bg-blush/5 border-blush' : 'bg-white border-[#F3E8E5] hover:border-blush/30'
                                        )}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                    !isCOD ? 'border-blush bg-blush shadow-lg shadow-blush/20' : 'border-neutral-200'
                                                )}>
                                                    {!isCOD && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4 text-charcoal" />
                                                        <span className="font-bold text-charcoal">Pay Online</span>
                                                    </div>
                                                    <p className="text-[10px] text-neutral-500 mt-0.5">UPI, Cards, Net Banking</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">Recommended</span>
                                                    <p className="text-[10px] text-neutral-400 mt-1">Lower Fees</p>
                                                </div>
                                            </div>
                                            <input type="radio" checked={!isCOD} onChange={() => setIsCOD(false)} className="hidden" />
                                        </label>

                                        {/* COD */}
                                        <label className={cn(
                                            "block p-4 rounded-2xl cursor-pointer transition-all border-2",
                                            isCOD ? 'bg-blush/5 border-blush' : 'bg-white border-[#F3E8E5] hover:border-blush/30'
                                        )}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                    isCOD ? 'border-blush bg-blush shadow-lg shadow-blush/20' : 'border-neutral-200'
                                                )}>
                                                    {isCOD && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-charcoal" />
                                                        <span className="font-bold text-charcoal">Cash on Delivery</span>
                                                    </div>
                                                    <p className="text-[10px] text-neutral-500 mt-0.5">Pay when you receive</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Extra Fees</p>
                                                    <p className="text-[10px] text-red-400 mt-1">Apply</p>
                                                </div>
                                            </div>
                                            <input type="radio" checked={isCOD} onChange={() => setIsCOD(true)} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                {/* Delivery Address Selection */}
                                {user && (
                                    <div className="mb-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Delivery Address</p>
                                            <Link href="/profile" className="text-[10px] font-bold text-blush hover:underline flex items-center gap-1">
                                                Manage <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        </div>

                                        {addressesLoading ? (
                                            <div className="animate-pulse bg-neutral-50 rounded-2xl p-6 border border-[#F3E8E5]">
                                                <div className="h-3 bg-neutral-200 rounded w-3/4 mb-2"></div>
                                                <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                                            </div>
                                        ) : addresses.length > 0 ? (
                                            <div className="space-y-3">
                                                {addresses.slice(0, 2).map((addr) => (
                                                    <label
                                                        key={addr.id}
                                                        className={cn(
                                                            "block p-5 rounded-2xl cursor-pointer transition-all border-2",
                                                            selectedAddressId === addr.id ? 'bg-blush/5 border-blush' : 'bg-white border-[#F3E8E5] hover:border-blush/30'
                                                        )}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                                                selectedAddressId === addr.id ? 'border-blush bg-blush shadow-lg shadow-blush/20' : 'border-neutral-200'
                                                            )}>
                                                                {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-charcoal text-sm">{addr.name}</span>
                                                                    <span className="text-[9px] px-2 py-0.5 bg-neutral-100 rounded-md text-neutral-500 font-bold uppercase tracking-widest">{addr.label}</span>
                                                                </div>
                                                                <p className="text-xs text-neutral-500 line-clamp-1">{addr.addressLine1}, {addr.city}</p>
                                                            </div>
                                                        </div>
                                                        <input type="radio" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="hidden" />
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 bg-[#FDFBFB] rounded-3xl text-center border-2 border-dashed border-[#F3E8E5]">
                                                <MapPin className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
                                                <p className="text-sm font-bold text-charcoal mb-4">No delivery address added</p>
                                                <Link
                                                    href="/profile"
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blush text-white rounded-xl text-xs font-bold hover:bg-blush/90 transition-all shadow-lg shadow-blush/20"
                                                >
                                                    <PlusCircle className="w-4 h-4" /> Add Address
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Main CTA Button */}
                                <button
                                    onClick={async () => {
                                        if (!user) {
                                            router.push("/login?redirect=/cart");
                                            return;
                                        }
                                        const deliveryProfile = getDeliveryProfile();
                                        if (!deliveryProfile?.addressLine1 || !deliveryProfile?.pincode || !deliveryProfile?.phone) {
                                            toast.warning("Incomplete delivery details");
                                            router.push("/profile?redirect=/cart");
                                            return;
                                        }

                                        setIsCheckingOut(true);
                                        try {
                                            const res = await apiFetch("/api/razorpay/order", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                    cart,
                                                    userId: user.uid,
                                                    profile: deliveryProfile,
                                                    couponCode,
                                                    isCOD,
                                                    paymentBreakdown,
                                                }),
                                            });

                                            const data = await res.json();
                                            if (!res.ok) throw new Error(data.error || "Order creation failed");

                                            if (isCOD) {
                                                toast.success("Order placed successfully!");
                                                clearCart();
                                                router.push(`/orders/${data.firestoreOrderId}`);
                                                return;
                                            }

                                            // Online Payment Flow
                                            const options = {
                                                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                                                amount: data.amount,
                                                currency: data.currency,
                                                name: "Miks & Chiks",
                                                description: "Premium Maternity & Kids Wear",
                                                order_id: data.orderId,
                                                handler: async function (response: any) {
                                                    const verifyRes = await apiFetch("/api/razorpay/verify", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(response),
                                                    });
                                                    const vData = await verifyRes.json();
                                                    if (vData.success) {
                                                        toast.success("Payment successful!");
                                                        clearCart();
                                                        router.push(`/orders/${vData.firestoreOrderId}`);
                                                    }
                                                },
                                                prefill: {
                                                    name: deliveryProfile?.name || "",
                                                    email: user.email,
                                                    contact: deliveryProfile?.phone || "",
                                                },
                                                theme: { color: "#F8AFA6" },
                                            };
                                            const rzp = new (window as any).Razorpay(options);
                                            rzp.open();
                                        } catch (err: any) {
                                            toast.error(err.message || "Checkout failed");
                                        } finally {
                                            setIsCheckingOut(false);
                                        }
                                    }}
                                    disabled={isCheckingOut || totalSellingPrice < MIN_ORDER_VALUE}
                                    className={cn(
                                        "w-full py-6 rounded-3xl font-bold text-lg transition-all shadow-2xl flex items-center justify-center gap-3 group active:scale-95",
                                        isCheckingOut || totalSellingPrice < MIN_ORDER_VALUE
                                            ? "bg-neutral-100 text-neutral-300 cursor-not-allowed shadow-none"
                                            : "bg-gradient-to-r from-charcoal to-neutral-800 text-white hover:shadow-charcoal/20"
                                    )}
                                >
                                    {isCheckingOut ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            {!user ? "Login to Continue" : !hasCompleteAddress ? "Add Address to Continue" : "Proceed to Secure Checkout"}
                                            <Lock className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-[10px] text-neutral-400 mt-6 uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2">
                                    <Shield className="w-3.5 h-3.5" />
                                    Protected by Razorpay Secure
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
