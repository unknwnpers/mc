"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Mail, MapPin, Phone, Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, profile, updateProfile, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSave = async () => {
    // 1. Basic Validation
    if (!name.trim() || !address.trim() || !phone.trim()) {
      toast.error("All profile fields are required for delivery");
      return;
    }

    // 2. Phone Validation (Indian standard 10 digits)
    if (!/^\d{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ name, address, phone });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50">
      <Navbar />

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* BREADCRUMB */}
          <Link 
            href="/cart" 
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors mb-8 font-medium group text-sm"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Cart
          </Link>

          <div className="bg-white rounded-[40px] border border-neutral-100 shadow-xl shadow-rose-100/20 overflow-hidden">
            {/* HEADER */}
            <div className="bg-rose-50/50 p-10 border-b border-neutral-100 relative">
               <div className="absolute top-0 right-0 p-10 opacity-10">
                  <User className="w-32 h-32 text-rose-400" />
               </div>
               
               <div className="relative flex items-center gap-6">
                  <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-rose-100">
                     <User className="w-10 h-10 text-rose-400" />
                  </div>
                  <div>
                     <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Your Profile</h1>
                     <p className="text-neutral-500 font-medium">Manage your shipping and contact details</p>
                  </div>
               </div>
            </div>

            {/* FORM */}
            <div className="p-10 space-y-8">
               {/* PERSONAL INFO */}
               <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Account Basics</h2>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Display Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-rose-400 transition-colors" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-neutral-50 border-none px-12 py-4 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all font-medium text-neutral-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Email Address</label>
                    <div className="relative opacity-60">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        value={user.email || ""}
                        disabled
                        className="w-full bg-neutral-100 border-none px-12 py-4 rounded-2xl font-medium text-neutral-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
               </div>

               <div className="h-px bg-neutral-100" />

               {/* DELIVERY INFO */}
               <div className="space-y-6">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">Shipping & Contact</h2>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Contact Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-rose-400 transition-colors" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full bg-neutral-50 border-none px-12 py-4 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all font-medium text-neutral-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-700">Shipping Address</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-6 w-4 h-4 text-neutral-400 group-focus-within:text-rose-400 transition-colors" />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No, Building, Area, Street, Landmark..."
                        className="w-full bg-neutral-50 border-none pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-rose-200 transition-all font-medium min-h-[120px] text-neutral-700 leading-relaxed"
                      />
                    </div>
                  </div>
               </div>

               <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-neutral-900 text-white py-5 rounded-2xl font-bold hover:bg-rose-500 transition-all shadow-xl shadow-neutral-200 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
               >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isSaving ? "Saving Changes..." : "Save Profile Details"}
               </button>
            </div>
          </div>

          <p className="text-center mt-8 text-neutral-400 text-sm font-medium">
             Your data is encrypted and used only for fulfilling your orders.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
