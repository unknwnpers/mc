"use client";

import { loginWithGoogle } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhoneAuth from "@/components/PhoneAuth";
import Link from "next/link";
import { toast } from "sonner";
import { useState, Suspense, useEffect } from "react";
import { ShoppingBag, ArrowRight, Phone, Mail, AlertCircle } from "lucide-react";
import { initAppCheck } from "@/lib/firebase";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"choice" | "google" | "phone">("choice");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  // Initialize App Check on mount
  useEffect(() => {
    initAppCheck();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loginWithGoogle();
      
      // Extract email from either location (Firebase sometimes puts it in providerData only)
      const googleProvider = result.user.providerData.find(p => p.providerId === 'google.com');
      const userEmail = result.user.email || googleProvider?.email || null;
      const userDisplayName = result.user.displayName || googleProvider?.displayName || null;
      
      // Validate Google auth response - email is required
      if (!userEmail) {
        toast.error("Unable to retrieve email from Google. Please ensure your Google account has a verified email.");
        setLoading(false);
        return;
      }
      
      if (!userDisplayName || userDisplayName.trim().length < 2) {
        toast.error("Unable to retrieve valid name from Google. Please check your Google profile.");
        setLoading(false);
        return;
      }
      
      // Save user to Firestore via API (for consistency with phone auth)
      try {
        // Force token refresh to ensure it's valid
        const token = await result.user.getIdToken(true);
        const requestBody = {
          uid: result.user.uid,
          email: userEmail,
          name: userDisplayName,
          provider: "google",
        };
        
        console.log("[Login] Sending to API:", requestBody);
        
        const response = await fetch("/api/user/create", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
        
        const responseData = await response.json();
        console.log("[Login] API response:", responseData);
        
        if (!response.ok) {
          console.error("[Login] API error:", responseData);
          // Check for token-related errors
          if (response.status === 401) {
            toast.error("Session expired. Please sign in again.");
          } else {
            toast.error("Failed to sync profile. Please try again.");
          }
          setLoading(false);
          return;
        }
      } catch (syncError) {
        console.error("[Login] Profile sync error:", syncError);
        toast.error("Profile sync failed. Please try again.");
        setLoading(false);
        return;
      }
      
      toast.success("Welcome to MIKS&CHIKS!");
      router.push(redirectPath);
    } catch (err: any) {
      console.error("[Login] Google login error:", err);
      
      // Map common Firebase errors to user-friendly messages
      const errorMessages: Record<string, string> = {
        "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
        "auth/popup-blocked": "Pop-up was blocked. Please allow pop-ups and try again.",
        "auth/network-request-failed": "Network error. Please check your connection.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/user-disabled": "This account has been disabled. Contact support.",
        "auth/account-exists-with-different-credential": "An account exists with this email using a different sign-in method.",
      };
      
      const message = errorMessages[err.code] || err.message || "Google login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSuccess = () => {
    router.push(redirectPath);
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
            <p className="text-neutral-500 font-sans mb-8 text-lg">
              Sign in to your premium fashion experience
            </p>

            {/* Auth Method Selection */}
            {authMethod === "choice" && (
              <div className="space-y-4">
                {/* Error Display */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Google Login Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-4 bg-blush text-white py-5 rounded-3xl font-bold text-lg hover:bg-[#f48c82] transition-all shadow-2xl shadow-blush/30 active:scale-95 disabled:opacity-50 transform hover:scale-[1.02]"
                >
                  {loading ? (
                     <div className="h-6 w-6 animate-spin rounded-full border-3 border-solid border-white border-r-transparent" />
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

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 text-sm font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Phone Login Button */}
                <button
                  onClick={() => {
                    setError(null);
                    setAuthMethod("phone");
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-white text-charcoal py-5 rounded-3xl font-bold text-lg border-2 border-gray-200 hover:border-blush hover:text-blush transition-all"
                >
                  <Phone className="w-6 h-6" />
                  <span>Continue with Phone OTP</span>
                </button>
                
                {/* Help text */}
                <p className="text-center text-sm text-gray-400 mt-4">
                  <Mail className="w-4 h-4 inline mr-1" />
                  We'll send a verification code to your phone
                </p>
              </div>
            )}

            {/* Phone Auth Component */}
            {authMethod === "phone" && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setError(null);
                    setAuthMethod("choice");
                  }}
                  className="text-sm text-gray-400 hover:text-blush transition-colors mb-4"
                >
                  ← Back to all options
                </button>
                <PhoneAuth onSuccess={handlePhoneSuccess} redirectPath={redirectPath} />
              </div>
            )}

            <div className="mt-12 pt-10 border-t border-[#F3E8E5]">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em] leading-relaxed">
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
