"use client";

import { useCart } from "@/context/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ApplyCoupon } from "@/components/ApplyCoupon";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Check, PlusCircle, Truck, Package, CreditCard, HelpCircle, Shield, RefreshCw, Headphones, AlertCircle, ShoppingBag, MapPin, Info, Loader2, Box, ChevronRight, Phone, CheckCircle2, Lock } from "lucide-react";

const MIN_ORDER_VALUE = 200;
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { db, apiFetch, ensureAppCheckReady } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SavedAddress } from "@/lib/types";
import { PaymentBreakdown } from "@/lib/payment-calculator";
import { cn } from "@/lib/utils";

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, clearCart, loading } = useCart();
    const { user, profile } = useAuth();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [addressesLoading, setAddressesLoading] = useState(true);
    const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null);
    const [isCOD, setIsCOD] = useState(false);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    // Pre-warm App Check token so it's ready when checkout is clicked
    useEffect(() => {
        ensureAppCheckReady().catch(() => {});
    }, []);

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // Computed state: Check if we have a complete delivery address
    const hasCompleteAddress = (() => {
        // Check if a saved address is selected
        if (selectedAddressId && addresses.length > 0) {
            const selectedAddr = addresses.find(a => a.id === selectedAddressId);
            if (selectedAddr && 
                selectedAddr.addressLine1 && 
                selectedAddr.city && 
                selectedAddr.pincode && 
                selectedAddr.phone) {
                return true;
            }
        }
        // Fall back to profile address check
        return !!(profile?.addressLine1 && profile?.city && profile?.pincode && profile?.phone && profile?.email && profile?.name);
    })();

    // Get the delivery profile (selected address or profile)
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
            if (!user || (total || 0) === 0) {
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
                        subtotal:        total,
                        mrpTotal:        total, // same as subtotal; per-item discount already applied
                        couponDiscount:  discount,
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
                // Fallback to simple calculation
                setFinalAmount(total - discount);
            } finally {
                setBreakdownLoading(false);
            }
        };

        fetchBreakdown();
    }, [total, discount, isCOD, user]);

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
                    // Select default address or first address
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
                    <Loader2 className="w-10 h-10 animate-spin text-[#C8B273] mx-auto" />
                    <p className="mt-4 text-neutral-600 font-sans font-medium">Loading your selection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FCF9F7]">
            <Navbar />

            <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-32 md:py-40">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <p className="text-[13px] font-medium text-neutral-400 mb-2">Shopping Bag</p>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#3B312C] tracking-tight">Your <span className="text-[#C8B273] italic">Cart</span></h1>
                    </div>
                    {cart.length > 0 && (
                        <button 
                            onClick={() => {
                                if (confirm("Are you sure you want to remove all items from your cart?")) {
                                    clearCart();
                                    toast.success("Cart cleared");
                                }
                            }}
                            className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-[#F3E8E5] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Clear All
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-24 md:py-32 bg-white rounded-[40px] border border-dashed border-[#F3E8E5] shadow-sm">
                        <div className="w-20 md:w-24 h-20 md:h-24 bg-[#F8F4EE] rounded-[32px] flex items-center justify-center mx-auto mb-8 text-[#C8B273]/20">
                            <ShoppingCart className="w-10 md:w-12 h-10 md:h-12" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#3B312C] mb-4">Your cart is empty</h2>
                        <p className="text-neutral-500 mb-10 max-w-sm mx-auto text-sm md:text-base leading-relaxed">
                            Looks like you haven't added anything to your cart yet. Trendy collections are waiting for you!
                        </p>
                        <Link href="/products" className="inline-flex items-center gap-2 bg-[#3B312C] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#3B312C]/20 hover:bg-black transition-all active:scale-95">
                            Start Shopping
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 xl:gap-12 items-start">
                        {/* ITEMS LIST */}
                        <div className="space-y-6">
                            {cart.map((item) => {
                                const itemMrp = item.mrp || item.price;
                                const hasDiscount = itemMrp > item.price;
                                const discountPercentage = hasDiscount ? Math.round(((itemMrp - item.price) / itemMrp) * 100) : 0;

                                return (
                                <div
                                    key={`${item.id}-${item.sku}`}
                                    className="bg-white rounded-[32px] border border-[#F3E8E5] p-5 md:p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className="flex gap-5 md:items-start">
                                        {/* Product Image */}
                                        <div className="w-24 md:w-32 h-24 md:h-32 bg-[#F8F4EE] rounded-[24px] overflow-hidden shrink-0 border border-[#F3E8E5] relative">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="text-sm md:text-lg font-serif font-bold text-[#3B312C] truncate leading-tight mb-1">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-[10px] md:text-[11px] font-medium text-neutral-400 mb-3">
                                                        Size: {item.selectedSize} {item.sku.includes('-') && `| Color: ${item.sku.split('-')[1]}`}
                                                    </p>

                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className="text-lg md:text-xl font-serif font-bold text-[#C8B273]">
                                                            ₹{item.price.toLocaleString()}
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="text-[11px] md:text-[13px] text-neutral-300 line-through font-medium">
                                                                ₹{itemMrp.toLocaleString()}
                                                            </span>
                                                        )}
                                                        {hasDiscount && (
                                                            <span className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">
                                                                {discountPercentage}% OFF
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        removeFromCart(item.id, item.sku);
                                                        toast.error(`${item.name} removed`);
                                                    }}
                                                    className="p-2 text-neutral-300 hover:text-red-500 transition-all active:scale-90"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-neutral-50 rounded-xl border border-neutral-100/50">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                Math.max(1, item.quantity - 1),
                                                                item.sku
                                                            )
                                                        }
                                                        disabled={item.quantity <= 1}
                                                        className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-[#C8B273] transition-all disabled:opacity-30"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>

                                                    <span className="w-6 text-center text-[13px] font-bold text-[#3B312C]">
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(item.id, item.quantity + 1, item.sku)
                                                        }
                                                        className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-[#C8B273] transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}

                            {/* Address Selection Container */}
                            {user && cart.length > 0 && (
                                <div className="bg-white rounded-[40px] border border-[#F3E8E5] p-8 md:p-10 shadow-sm mt-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-xl font-serif font-bold text-[#3B312C]">Delivery <span className="text-[#C8B273] italic">Address</span></h3>
                                        </div>
                                        <Link href="/profile?tab=addresses" className="text-[10px] font-black text-[#C8B273] uppercase tracking-widest hover:underline">Manage Addresses</Link>
                                    </div>

                                    {addressesLoading ? (
                                        <div className="space-y-4">
                                            <div className="h-32 bg-neutral-50 rounded-[32px] animate-pulse" />
                                        </div>
                                    ) : addresses.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {addresses.map((addr) => (
                                                <label 
                                                    key={addr.id}
                                                    className={cn(
                                                        "relative p-6 rounded-[32px] cursor-pointer transition-all border-2 flex flex-col justify-between min-h-[160px]",
                                                        selectedAddressId === addr.id 
                                                            ? "bg-[#F8F4EE]/10 border-[#C8B273] shadow-lg shadow-[#C8B273]/5"
                                                            : "bg-neutral-50/50 border-transparent hover:border-neutral-200"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-[#3B312C] text-sm">{addr.name}</span>
                                                                {addr.isDefault && <span className="text-[8px] bg-rose-50 text-[#C8B273] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Default</span>}
                                                            </div>
                                                            <div className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                selectedAddressId === addr.id ? "bg-[#C8B273] border-[#C8B273]" : "border-neutral-200"
                                                            )}>
                                                                {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-neutral-500 mb-2 flex items-center gap-2">
                                                            <Phone className="w-3 h-3 text-[#C8B273]/40" /> +91 {addr.phone}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-neutral-600 leading-relaxed line-clamp-2">
                                                            {addr.addressLine1}, {addr.city}, {addr.state} - {addr.pincode}
                                                        </p>
                                                    </div>
                                                    <input 
                                                        type="radio" 
                                                        name="address" 
                                                        checked={selectedAddressId === addr.id}
                                                        onChange={() => setSelectedAddressId(addr.id)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            ))}
                                            <Link 
                                                href="/profile?tab=addresses"
                                                className="flex flex-col items-center justify-center p-6 bg-neutral-50/50 border-2 border-dashed border-neutral-200 rounded-[32px] text-neutral-400 hover:border-[#C8B273] hover:text-[#C8B273] transition-all group min-h-[160px]"
                                            >
                                                <PlusCircle className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Add New Address</span>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center bg-neutral-50/50 rounded-[32px] border-2 border-dashed border-neutral-200">
                                            <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
                                            <p className="text-sm font-medium text-neutral-500 mb-6">No saved addresses found</p>
                                            <Link 
                                                href="/profile?tab=addresses"
                                                className="inline-flex items-center gap-2 px-8 py-3 bg-[#C8B273] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                                            >
                                                <PlusCircle className="w-3.5 h-3.5" /> Add Address
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="space-y-6 lg:sticky lg:top-40">
                            <div className="bg-white p-8 rounded-[40px] border border-[#F3E8E5] shadow-xl shadow-[#3B312C]/5 relative overflow-hidden">
                                <h2 className="text-2xl font-serif font-bold text-[#3B312C] mb-8">
                                    Order <span className="text-[#C8B273] italic">Summary</span>
                                </h2>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-bold text-[#3B312C]">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                                        <span className="text-[13px] font-bold text-[#3B312C]">₹{(paymentBreakdown?.mrpTotal ?? cart.reduce((s, i) => s + (i.mrp || i.price) * i.quantity, 0)).toLocaleString()}</span>
                                    </div>

                                    {(discount > 0 || (paymentBreakdown?.discountAmount ?? 0) > 0) && (
                                        <div className="flex justify-between items-center text-emerald-600">
                                            <span className="text-[13px] font-bold">Discount {(discount > 0) && `(Coupon)`}</span>
                                            <span className="text-[13px] font-bold">-₹{(discount + (paymentBreakdown?.discountAmount ?? 0)).toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-neutral-50 my-1" />

                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-bold text-[#3B312C]">Subtotal After Discount</span>
                                        <span className="text-[13px] font-bold text-[#3B312C]">₹{(paymentBreakdown?.subtotal ?? total ?? 0).toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[13px] font-bold text-[#3B312C]">Convenience Fee</span>
                                            <HelpCircle className="w-3.5 h-3.5 text-neutral-300 cursor-help" />
                                        </div>
                                        <span className="text-[13px] font-bold text-[#3B312C]">
                                            {breakdownLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `₹${paymentBreakdown?.platformFee ?? 0}`}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-bold text-[#3B312C]">Shipping</span>
                                            <Truck className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Free</span>
                                    </div>

                                    <div className="pt-4 border-t border-neutral-100">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm font-bold text-[#3B312C] mb-1">Total Amount</p>
                                                <p className="text-[10px] font-medium text-neutral-400">Inclusive of all taxes</p>
                                            </div>
                                            <p className="text-4xl font-serif font-bold text-[#C8B273] tracking-tight">
                                                ₹{breakdownLoading ? "..." : (finalAmount || total).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Savings Badge */}
                                {(discount > 0 || (paymentBreakdown?.discountAmount ?? 0) > 0) && (
                                    <div className="bg-emerald-50 border border-emerald-100/50 rounded-2xl p-4 flex items-center gap-3 mb-8">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                                            <Info className="w-4 h-4" />
                                        </div>
                                        <p className="text-[13px] font-bold text-emerald-600">
                                            You saved ₹{(discount + (paymentBreakdown?.discountAmount ?? 0)).toLocaleString()} on this order
                                        </p>
                                    </div>
                                )}

                                {/* Coupon Section */}
                                <div className="mb-8">
                                    <ApplyCoupon
                                        orderAmount={total}
                                        onCouponApplied={(discountAmt) => setDiscount(discountAmt)}
                                        onCouponRemoved={() => setDiscount(0)}
                                    />
                                    <p className="text-[10px] font-medium text-blue-500 flex items-center gap-1.5 mt-3 ml-1">
                                        <Info className="w-3 h-3" /> Discount will be calculated automatically.
                                    </p>
                                </div>

                                {/* Payment Method Selection */}
                                <div className="mb-8 space-y-4">
                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest ml-1">Payment Method</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => setIsCOD(false)}
                                            className={cn(
                                                "relative flex items-center gap-4 p-5 rounded-3xl transition-all border-2 text-left",
                                                !isCOD ? "bg-white border-[#C8B273] shadow-md" : "bg-neutral-50/50 border-transparent hover:border-neutral-200"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", !isCOD ? "bg-[#C8B273] border-[#C8B273]" : "border-neutral-300")}>
                                                {!isCOD && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <CreditCard className={cn("w-4 h-4", !isCOD ? "text-[#C8B273]" : "text-neutral-400")} />
                                                    <span className={cn("text-[13px] font-bold", !isCOD ? "text-[#3B312C]" : "text-neutral-500")}>Pay Online</span>
                                                    {!isCOD && <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded ml-auto">Recommended</span>}
                                                </div>
                                                <p className="text-[10px] font-medium text-neutral-400">UPI, Cards, Net Banking</p>
                                            </div>
                                            {!isCOD && <span className="absolute top-2 right-4 text-[8px] font-black text-emerald-500 uppercase tracking-widest">Lower Fees</span>}
                                        </button>

                                        <button
                                            onClick={() => setIsCOD(true)}
                                            className={cn(
                                                "relative flex items-center gap-4 p-5 rounded-3xl transition-all border-2 text-left",
                                                isCOD ? "bg-white border-[#C8B273] shadow-md" : "bg-neutral-50/50 border-transparent hover:border-neutral-200"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", isCOD ? "bg-[#C8B273] border-[#C8B273]" : "border-neutral-300")}>
                                                {isCOD && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <Box className={cn("w-4 h-4", isCOD ? "text-[#C8B273]" : "text-neutral-400")} />
                                                    <span className={cn("text-[13px] font-bold", isCOD ? "text-[#3B312C]" : "text-neutral-500")}>Cash on Delivery</span>
                                                </div>
                                                <p className="text-[10px] font-medium text-neutral-400">Pay when you receive</p>
                                            </div>
                                            {isCOD && <span className="absolute top-2 right-4 text-[8px] font-black text-amber-500 uppercase tracking-widest">Additional charges apply</span>}
                                        </button>
                                    </div>
                                </div>

                                {/* Delivery Address Section */}
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest ml-1">Delivery Address</p>
                                        {addresses.length > 0 && <Link href="/profile?tab=addresses" className="text-[9px] font-black text-[#C8B273] uppercase tracking-widest hover:underline">Manage Addresses</Link>}
                                    </div>

                                    {!hasCompleteAddress ? (
                                        <div className="bg-neutral-50 rounded-[32px] p-6 text-center border border-dashed border-neutral-200">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                <MapPin className="w-5 h-5 text-neutral-300" />
                                            </div>
                                            <p className="text-xs font-bold text-neutral-400 mb-4">No delivery address added</p>
                                            <Link
                                                href="/profile?tab=addresses"
                                                className="inline-flex items-center gap-2 bg-[#C8B273]/10 text-[#C8B273] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#C8B273] hover:text-white transition-all shadow-sm shadow-[#C8B273]/10"
                                            >
                                                <Plus className="w-3 h-3" /> Add Address
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="bg-neutral-50 rounded-[32px] p-5 flex items-start gap-4">
                                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#C8B273] shadow-sm shrink-0">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-[#3B312C] truncate">
                                                    {getDeliveryProfile()?.name}
                                                </p>
                                                <p className="text-[11px] font-medium text-neutral-500 leading-relaxed line-clamp-1">
                                                    {getDeliveryProfile()?.addressLine1}, {getDeliveryProfile()?.city}
                                                </p>
                                            </div>
                                            <Link href="/profile?tab=addresses" className="p-2 text-neutral-300 hover:text-[#C8B273] ml-auto">
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Checkout Button */}
                                <button
                                    onClick={async () => {
                                        if (!user) {
                                            toast.info("Please login to checkout");
                                            router.push("/login?redirect=/cart");
                                            return;
                                        }

                                        const deliveryProfile = getDeliveryProfile();

                                        if (!deliveryProfile?.addressLine1 || !deliveryProfile?.city || !deliveryProfile?.pincode || !deliveryProfile?.phone || !deliveryProfile?.email || !deliveryProfile?.name) {
                                            toast.warning("Incomplete profile. Address details are mandatory for purchase.");
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
                                                    discount,
                                                    finalAmount,
                                                    isCOD,
                                                    paymentBreakdown,
                                                }),
                                            });

                                            const data = await res.json();
                                            if (!res.ok) {
                                                if (data.type === "INVENTORY_ERROR") {
                                                    toast.error(data.error || "Some items are no longer available.");
                                                    return;
                                                }
                                                throw new Error(data.error || "Order creation failed");
                                            }

                                            if (isCOD) {
                                                toast.success("COD Order placed successfully!");
                                                clearCart();
                                                router.push(`/orders/${data.firestoreOrderId}`);
                                                return;
                                            }

                                            if (data.isMock) {
                                                toast.success("Test Mode: Order placed successfully!");
                                                router.push("/profile?tab=orders");
                                                clearCart();
                                                return;
                                            }

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
                                                        const verifyRes = await apiFetch("/api/razorpay/verify", {
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
                                                    name: deliveryProfile?.name || "",
                                                    email: user.email,
                                                    contact: deliveryProfile?.phone || "",
                                                },
                                                theme: {
                                                    color: "#F8AFA6",
                                                },
                                            };

                                            const rzp = new (window as any).Razorpay(options);
                                            rzp.on('payment.failed', async function (response: any) {
                                                console.error("Payment failure:", response.error);
                                                setIsCheckingOut(true);
                                                try {
                                                    await apiFetch("/api/razorpay/cancel", {
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
                                    disabled={isCheckingOut || total < MIN_ORDER_VALUE}
                                    className={cn(
                                        "w-full py-5 rounded-[28px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 group active:scale-95 shadow-xl shadow-[#C8B273]/20",
                                        isCheckingOut || total < MIN_ORDER_VALUE
                                            ? "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                                            : (!hasCompleteAddress ? "bg-[#3B312C] text-white hover:bg-black" : "bg-[#C8B273] text-white hover:bg-[#B89B5E]")
                                    )}
                                >
                                    {isCheckingOut ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            {!user
                                                ? "Login to Checkout"
                                                : !hasCompleteAddress
                                                    ? <><Lock className="w-3.5 h-3.5" /> Add Address to Continue</>
                                                    : total < MIN_ORDER_VALUE
                                                        ? `Min Order ₹${MIN_ORDER_VALUE}`
                                                        : `Place Order • ₹${(finalAmount || total).toLocaleString()}`
                                            }
                                            {hasCompleteAddress && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                        </>
                                    )}
                                </button>

                                <div className="mt-6 space-y-4">
                                    <p className="text-[10px] font-bold text-neutral-400 text-center flex items-center justify-center gap-2">
                                        <Shield className="w-3.5 h-3.5 text-emerald-500" /> Your data is protected and safe with us.
                                    </p>

                                    <div className="flex items-center justify-around py-4 border-t border-neutral-50">
                                        <div className="text-center group">
                                            <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                                            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Secure Payment</p>
                                        </div>
                                        <div className="text-center group">
                                            <RefreshCw className="w-5 h-5 text-indigo-400 mx-auto mb-1 group-hover:rotate-180 transition-all duration-700" />
                                            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Easy Returns</p>
                                        </div>
                                        <div className="text-center group">
                                            <Headphones className="w-5 h-5 text-rose-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                                            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">24/7 Support</p>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.2em] mb-2">Protected by <span className="text-blue-500">Razorpay Secure</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
