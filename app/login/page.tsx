"use client";

import { loginWithGoogle } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { toast } from "sonner";
import { useState, Suspense } from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome to MIKS&CHIKS!");
      router.push(redirectPath);
    } catch (err: any) {
      toast.error(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 pt-32 pb-16">
        <div className="max-w-md w-full">
          {/* BRANDING CARD */}
          <div className="bg-white p-12 rounded-[50px] shadow-2xl shadow-blush/10 border border-[#F3E8E5] text-center relative overflow-hidden group/card transform hover:-translate-y-2 transition-all duration-700">
            {/* DECORATIVE BACKGROUND */}
            <div className="absolute top-0 left-0 w-full h-3 bg-blush opacity-60" />
            
            <div className="mb-12 inline-flex items-center justify-center w-24 h-24 bg-cream rounded-[32px] text-blush border border-blush/10 shadow-sm transform group-hover/card:rotate-6 transition-transform duration-500">
               <ShoppingBag className="w-12 h-12" />
            </div>

            <h1 className="text-5xl font-serif font-bold text-charcoal mb-4 tracking-tight">
              Welcome <span className="text-blush italic">Back</span>
            </h1>
            <p className="text-neutral-500 font-sans mb-12 text-lg">
              Sign in to your premium fashion experience
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group w-full flex items-center justify-center gap-4 bg-blush text-white py-6 rounded-3xl font-bold text-xl hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/30 active:scale-95 disabled:opacity-50 transform hover:scale-[1.02]"
            >
              {loading ? (
                 <div className="h-7 w-7 animate-spin rounded-full border-3 border-solid border-white border-r-transparent" />
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="currentColor"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>

            <div className="mt-12 pt-10 border-t border-[#F3E8E5]">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] leading-relaxed">
                   Fast, Secure & Passwordless.<br/>
                   By continuing, you agree to our <Link href="/terms" className="text-blush hover:underline cursor-pointer">Terms & Conditions</Link>.
                </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white font-serif italic text-2xl text-blush">
            Loading your experience...
        </div>
    }>
        <LoginContent />
    </Suspense>
  );
}
