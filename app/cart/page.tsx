"use client";

import { useCart } from "@/context/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ApplyCoupon } from "@/components/ApplyCoupon";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, Check, PlusCircle, Truck, Package, CreditCard, HelpCircle, Shield, RefreshCw, Headphones, AlertCircle } from "lucide-react";

const MIN_ORDER_VALUE = 200;
import Link from "next/link";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { User, MapPin, Phone, Info, Loader2 } from "lucide-react";
import { db, apiFetch, ensureAppCheckReady } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { SavedAddress } from "@/lib/types";
import { PaymentBreakdown } from "@/lib/payment-calculator";

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
        return !!(profile?.addressLine1 && profile?.city && profile?.pincode && profile?.phone);
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
            if (!user || total === 0) {
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
                        subtotal: total,
                        discount,
                        isCOD,
                    }),
                });
                
                const data = await res.json();
                if (data.success) {
                    setPaymentBreakdown(data.data);
                    setFinalAmount(data.data.total);
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
                                if (confirm("Are you sure you want to remove all items from your cart?")) {
                                    clearCart();
                                    toast.success("Cart cleared");
                                }
                            }}
                            className="text-neutral-400 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50"
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
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
                        {/* ITEMS LIST */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="space-y-6">
                                {cart.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-[32px] border border-[#F3E8E5] shadow-sm hover:shadow-xl hover:shadow-blush/5 transition-all duration-500 group"
                                    >
                                        {/* Product Image */}
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-cream rounded-[24px] sm:rounded-[32px] overflow-hidden shrink-0 border border-[#F3E8E5]">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            {/* Header: Title + Delete */}
                                            <div className="flex items-start justify-between gap-3 mb-1">
                                                <h3 className="font-serif font-bold text-lg sm:text-2xl text-charcoal truncate leading-tight">
                                                    {item.name}
                                                </h3>
                                                <button
                                                    onClick={() => {
                                                        removeFromCart(item.id, item.sku);
                                                        toast.error(`${item.name} removed`);
                                                    }}
                                                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90 shrink-0 -mr-2 -mt-2"
                                                    title="Remove item"
                                                    aria-label="Remove item from cart"
                                                >
                                                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                            </div>

                                            {/* Size */}
                                            {(() => {
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
                                                return displaySize ? (
                                                    <p className="text-[10px] sm:text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">
                                                        Size: {displaySize}
                                                    </p>
                                                ) : null;
                                            })()}

                                            {/* Price - Single, prominent */}
                                            <p className="text-blush font-bold text-xl sm:text-2xl mb-3 sm:mb-4">
                                                ₹{item.price * item.quantity}
                                            </p>

                                            {/* Quantity Selector - Improved touch targets */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.id,
                                                            Math.max(1, item.quantity - 1),
                                                            item.sku
                                                        )
                                                    }
                                                    disabled={item.quantity <= 1}
                                                    className="w-11 h-11 flex items-center justify-center bg-white border border-neutral-300 rounded-xl hover:border-blush hover:text-blush transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                                    aria-label="Decrease quantity"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>

                                                <span className="w-12 h-11 flex items-center justify-center font-bold text-charcoal font-sans text-lg bg-neutral-50 rounded-xl border border-neutral-200">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    onClick={() =>
                                                        updateQuantity(item.id, item.quantity + 1, item.sku)
                                                    }
                                                    className="w-11 h-11 flex items-center justify-center bg-white border border-neutral-300 rounded-xl hover:border-blush hover:text-blush transition-all active:scale-90 shadow-sm"
                                                    aria-label="Increase quantity"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ORDER SUMMARY */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-[#F3E8E5] shadow-xl shadow-blush/5 sticky top-32">
                            <h2 className="text-3xl font-serif font-bold text-charcoal mb-8">
                                Order <span className="text-blush italic">Summary</span>
                            </h2>

                            <div className="space-y-4 mb-6">
                                {/* Subtotal */}
                                <div className="flex justify-between text-charcoal/60 font-medium">
                                    <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                                    <span>₹{total}</span>
                                </div>

                                {/* Shipping */}
                                <div className="flex justify-between text-charcoal/60 font-medium">
                                    <div className="flex items-center gap-1">
                                        <Truck className="w-3.5 h-3.5" />
                                        <span>Shipping</span>
                                        {paymentBreakdown?.shipping === 0 && total > 0 && (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">FREE</span>
                                        )}
                                    </div>
                                    <span className={paymentBreakdown?.shipping === 0 ? "text-green-600 font-bold" : ""}>
                                        {breakdownLoading ? "..." : paymentBreakdown ? `₹${paymentBreakdown.shipping}` : "₹0"}
                                    </span>
                                </div>

                                {/* Handling Fee */}
                                {paymentBreakdown && paymentBreakdown.handlingFee > 0 && (
                                    <div className="flex justify-between text-charcoal/60 font-medium text-sm">
                                        <div className="flex items-center gap-1">
                                            <Package className="w-3.5 h-3.5" />
                                            <span>Handling Fee</span>
                                        </div>
                                        <span>₹{paymentBreakdown.handlingFee}</span>
                                    </div>
                                )}

                                {/* GST Breakdown */}
                                {paymentBreakdown && paymentBreakdown.gst.total > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-charcoal/60 font-medium text-sm">
                                            <div className="flex items-center gap-1">
                                                <span>GST (5%)</span>
                                                <span className="text-[10px] text-neutral-400">
                                                    ({paymentBreakdown.gst.cgst > 0 ? "CGST+SGST" : "IGST"})
                                                </span>
                                            </div>
                                            <span>₹{paymentBreakdown.gst.total}</span>
                                        </div>
                                        {paymentBreakdown.gst.cgst > 0 && (
                                            <div className="flex justify-between text-charcoal/40 text-xs pl-4">
                                                <span>CGST (2.5%)</span>
                                                <span>₹{paymentBreakdown.gst.cgst}</span>
                                            </div>
                                        )}
                                        {paymentBreakdown.gst.sgst > 0 && (
                                            <div className="flex justify-between text-charcoal/40 text-xs pl-4">
                                                <span>SGST (2.5%)</span>
                                                <span>₹{paymentBreakdown.gst.sgst}</span>
                                            </div>
                                        )}
                                        {paymentBreakdown.gst.igst > 0 && (
                                            <div className="flex justify-between text-charcoal/40 text-xs pl-4">
                                                <span>IGST (5%)</span>
                                                <span>₹{paymentBreakdown.gst.igst}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* COD Charge */}
                                {isCOD && paymentBreakdown && paymentBreakdown.codCharge > 0 && (
                                    <div className="flex justify-between text-charcoal/60 font-medium text-sm">
                                        <div className="flex items-center gap-1">
                                            <CreditCard className="w-3.5 h-3.5" />
                                            <span>COD Fee</span>
                                        </div>
                                        <span>₹{paymentBreakdown.codCharge}</span>
                                    </div>
                                )}
                                
                                {/* Coupon Applied Section */}
                                {discount > 0 && (
                                    <>
                                        <div className="h-px bg-neutral-200 my-2" />
                                        <div className="flex justify-between text-green-700 font-semibold">
                                            <span>Coupon Discount</span>
                                            <span>-₹{discount}</span>
                                        </div>
                                    </>
                                )}
                                
                                {/* Total Savings */}
                                {discount > 0 || (paymentBreakdown && paymentBreakdown.shipping === 0 && total < 999) && (
                                    <div className="bg-green-50 rounded-xl p-3 text-center">
                                        <span className="text-green-700 font-semibold text-sm">
                                            You saved ₹{(discount || 0) + (paymentBreakdown?.shipping === 0 ? 100 : 0)}!
                                        </span>
                                    </div>
                                )}
                                
                                <div className="h-px bg-neutral-200 my-2" />
                                
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xl font-bold text-charcoal">Total</span>
                                    <span className="text-4xl font-serif font-bold text-blush tracking-tight">
                                        ₹{breakdownLoading ? "..." : finalAmount}
                                    </span>
                                </div>
                            </div>

                            {/* Coupon Application Component */}
                            <div className="mb-6">
                                <ApplyCoupon
                                    orderAmount={total}
                                    onCouponApplied={(discountAmt, final, couponData) => {
                                        setDiscount(discountAmt);
                                    }}
                                    onCouponRemoved={() => {
                                        setDiscount(0);
                                    }}
                                />
                            </div>

                            {/* Payment Method Selection */}
                            <div className="mb-8">
                                <p className="text-xs font-bold text-charcoal uppercase tracking-widest mb-4">Payment Method</p>
                                <div className="space-y-3">
                                    {/* Online Payment */}
                                    <label className={`block p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                                        !isCOD ? 'bg-blush/5 border-blush' : 'bg-neutral-50 border-transparent hover:border-neutral-200'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                !isCOD ? 'border-blush bg-blush' : 'border-neutral-300'
                                            }`}>
                                                {!isCOD && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4 text-charcoal" />
                                                    <span className="font-bold text-charcoal">Pay Online</span>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-0.5">UPI, Cards, Net Banking</p>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">No extra fee</span>
                                        </div>
                                        <input 
                                            type="radio" 
                                            name="paymentMethod" 
                                            checked={!isCOD}
                                            onChange={() => setIsCOD(false)}
                                            className="hidden"
                                        />
                                    </label>

                                    {/* COD */}
                                    <label className={`block p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                                        isCOD ? 'bg-blush/5 border-blush' : 'bg-neutral-50 border-transparent hover:border-neutral-200'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                isCOD ? 'border-blush bg-blush' : 'border-neutral-300'
                                            }`}>
                                                {isCOD && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-charcoal" />
                                                    <span className="font-bold text-charcoal">Cash on Delivery</span>
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-0.5">Pay when you receive</p>
                                            </div>
                                            <span className="text-sm font-bold text-charcoal/60">+₹50</span>
                                        </div>
                                        <input 
                                            type="radio" 
                                            name="paymentMethod" 
                                            checked={isCOD}
                                            onChange={() => setIsCOD(true)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Address Selection */}
                            {user && cart.length > 0 && (
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-bold text-charcoal uppercase tracking-widest">Delivery Address</p>
                                        <Link href="/profile" className="text-xs font-bold text-blush hover:underline">Manage Addresses</Link>
                                    </div>
                                    
                                    {addressesLoading ? (
                                        <div className="animate-pulse bg-neutral-100 rounded-2xl p-6">
                                            <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                                            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                                        </div>
                                    ) : addresses.length > 0 ? (
                                        <div className="space-y-3">
                                            {addresses.map((addr) => (
                                                <label 
                                                    key={addr.id}
                                                    className={`block p-5 rounded-2xl cursor-pointer transition-all ${
                                                        selectedAddressId === addr.id 
                                                            ? 'bg-blush/5 border-2 border-blush' 
                                                            : 'bg-neutral-50 border-2 border-transparent hover:border-neutral-200'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                            selectedAddressId === addr.id 
                                                                ? 'border-blush bg-blush' 
                                                                : 'border-neutral-300'
                                                        }`}>
                                                            {selectedAddressId === addr.id && (
                                                                <Check className="w-3 h-3 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-charcoal">{addr.name}</span>
                                                                <span className="text-xs px-2 py-0.5 bg-white rounded-full text-neutral-500">{addr.label}</span>
                                                                {addr.isDefault && (
                                                                    <span className="text-xs px-2 py-0.5 bg-blush/10 rounded-full text-blush font-bold">Default</span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-neutral-500">+91 {addr.phone}</p>
                                                            <p className="text-sm text-neutral-600 mt-1">
                                                                {addr.addressLine1}
                                                                {addr.addressLine2 && `, ${addr.addressLine2}`}
                                                                {addr.landmark && ` (Near: ${addr.landmark})`}
                                                                <br />
                                                                {addr.city}, {addr.state} - {addr.pincode}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <input 
                                                        type="radio" 
                                                        name="address" 
                                                        value={addr.id}
                                                        checked={selectedAddressId === addr.id}
                                                        onChange={() => setSelectedAddressId(addr.id)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            ))}
                                            <Link 
                                                href="/profile"
                                                className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-500 hover:border-blush hover:text-blush transition-colors"
                                            >
                                                <PlusCircle className="w-5 h-5" />
                                                <span className="font-bold text-sm">Add New Address</span>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-neutral-50 rounded-2xl text-center">
                                            <MapPin className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                                            <p className="text-sm text-neutral-500 mb-3">No saved addresses</p>
                                            <Link 
                                                href="/profile"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blush text-white rounded-full text-sm font-bold hover:bg-blush/90 transition-colors"
                                            >
                                                <PlusCircle className="w-4 h-4" /> Add Address
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Check if address is selected */}
                            {user && !hasCompleteAddress && (
                                <div className="mb-8 p-6 bg-cream/50 rounded-3xl border border-blush/10 flex items-start gap-4">
                                    <Info className="w-6 h-6 text-blush shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-charcoal uppercase tracking-widest mb-2">Delivery Address Required</p>
                                        <p className="text-sm text-charcoal/60 leading-relaxed font-sans">
                                            Please add a delivery address to proceed with checkout.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Minimum Order Value Check */}
                            {user && hasCompleteAddress && total < MIN_ORDER_VALUE && (
                                <div className="mb-8 p-6 bg-amber-50 rounded-3xl border border-amber-200 flex items-start gap-4">
                                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Minimum Order Required</p>
                                        <p className="text-sm text-amber-700 leading-relaxed font-sans">
                                            Add ₹{MIN_ORDER_VALUE - total} more to checkout (minimum order ₹{MIN_ORDER_VALUE})
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

                                    // Get the delivery profile (selected address or profile)
                                    const deliveryProfile = getDeliveryProfile();

                                    // Check if delivery info is available
                                    if (!deliveryProfile?.addressLine1 || !deliveryProfile?.city || !deliveryProfile?.pincode || !deliveryProfile?.phone) {
                                        toast.warning("Please add a delivery address first");
                                        router.push("/profile?redirect=/cart");
                                        return;
                                    }

                                    setIsCheckingOut(true);
                                    try {
                                        // 1. Create Server-Validated Razorpay Order (with discount applied)
                                        // Use apiFetch to include App Check token automatically
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

                                        // 2. Handle COD Orders (Skip Razorpay)
                                        if (isCOD) {
                                            toast.success("COD Order placed successfully!");
                                            clearCart();
                                            router.push(`/orders/${data.firestoreOrderId}`);
                                            return;
                                        }

                                        // 3. Handle Bypass/Mock Mode
                                        if (data.isMock) {
                                            toast.success("Test Mode: Order placed successfully!");
                                            router.push("/orders");
                                            clearCart();
                                            return;
                                        }

                                        // 4. Open Razorpay Checkout Modal (Live Mode)
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
                                disabled={isCheckingOut || !hasCompleteAddress || total < MIN_ORDER_VALUE}
                                className={`
                                    w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-xl 
                                    flex items-center justify-center gap-3 group active:scale-95
                                    ${isCheckingOut || !hasCompleteAddress || total < MIN_ORDER_VALUE
                                        ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-blush to-rose-400 text-white hover:shadow-2xl hover:shadow-blush/30 animate-pulse"
                                    }
                                `}
                            >
                                {isCheckingOut ? (
                                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-solid border-white border-r-transparent" />
                                ) : (
                                    <>
                                        {!user 
                                            ? "Login to Checkout" 
                                            : !hasCompleteAddress 
                                                ? "Add Delivery Address" 
                                                : total < MIN_ORDER_VALUE
                                                    ? `Add ₹${MIN_ORDER_VALUE - total} More`
                                                    : isCOD 
                                                        ? `Pay ₹${finalAmount} Cash on Delivery`
                                                        : `Pay ₹${finalAmount} Securely`
                                        }
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </>
                                )}
                            </button>
                            
                            {/* Trust Signals */}
                            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-neutral-100">
                                <div className="text-center">
                                    <Shield className="w-5 h-5 text-green-600 mx-auto mb-1" />
                                    <p className="text-[10px] text-neutral-500 font-medium">Secure Payment</p>
                                </div>
                                <div className="text-center">
                                    <RefreshCw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                    <p className="text-[10px] text-neutral-500 font-medium">Easy Returns</p>
                                </div>
                                <div className="text-center">
                                    <Headphones className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                                    <p className="text-[10px] text-neutral-500 font-medium">24/7 Support</p>
                                </div>
                            </div>
                            
                            <p className="text-center text-[10px] text-gray-400 mt-6 uppercase tracking-[0.2em] font-bold">
                                Protected by Razorpay Secure
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Checkout Bar */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg z-50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs text-neutral-500">Total</p>
                            <p className="text-xl font-bold text-blush">₹{finalAmount || total}</p>
                        </div>
                        <button 
                            onClick={async () => {
                                if (!user) {
                                    toast.info("Please login to checkout");
                                    router.push("/login?redirect=/cart");
                                    return;
                                }
                                if (total < MIN_ORDER_VALUE) {
                                    toast.warning(`Minimum order ₹${MIN_ORDER_VALUE} required`);
                                    return;
                                }
                                // Scroll to checkout button on mobile
                                const checkoutBtn = document.querySelector('[data-checkout-btn]');
                                if (checkoutBtn) {
                                    checkoutBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                            }}
                            disabled={isCheckingOut || !hasCompleteAddress || total < MIN_ORDER_VALUE}
                            className={`
                                flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all
                                ${isCheckingOut || !hasCompleteAddress || total < MIN_ORDER_VALUE
                                    ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blush to-rose-400 text-white"
                                }
                            `}
                        >
                            {!user 
                                ? "Login" 
                                : !hasCompleteAddress 
                                    ? "Add Address" 
                                    : total < MIN_ORDER_VALUE
                                        ? `Add ₹${MIN_ORDER_VALUE - total}`
                                        : "Checkout"
                            }
                        </button>
                    </div>
                </div>
            )}

            <Footer />

        </div>
    );
}