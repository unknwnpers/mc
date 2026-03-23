"use client";

import { loginWithGoogle } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useState } from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome to MIKS&CHIKS!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 pt-32 pb-16">
        <div className="max-w-md w-full">
          {/* BRANDING CARD */}
          <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-rose-100/30 border border-neutral-100 text-center relative overflow-hidden">
            {/* DECORATIVE BACKGROUND */}
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-400" />
            
            <div className="mb-10 inline-flex items-center justify-center w-20 h-20 bg-rose-50 rounded-3xl text-rose-400 border border-rose-100 shadow-inner">
               <ShoppingBag className="w-10 h-10" />
            </div>

            <h1 className="text-4xl font-black text-neutral-900 mb-3 tracking-tight italic">
              Welcome Back
            </h1>
            <p className="text-neutral-500 font-medium mb-10 text-lg">
              Sign in to your premium fashion experience
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="group w-full flex items-center justify-center gap-4 bg-neutral-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-rose-500 transition-all shadow-xl shadow-neutral-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                 <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-white border-r-transparent" />
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
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="mt-10 pt-8 border-t border-neutral-50">
               <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest leading-relaxed">
                  Fast, Secure & Passwordless.<br/>
                  By continuing, you agree to our terms.
               </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
