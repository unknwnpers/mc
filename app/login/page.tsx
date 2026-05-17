"use client";

import { loginWithGoogle } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/cart-context";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { useState, Suspense, useEffect } from "react";
import { ShoppingBag, ArrowRight, Phone, Mail, AlertCircle, ShieldCheck, RefreshCw, User, Loader2 } from "lucide-react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PhoneAuth = dynamic(() => import("@/components/PhoneAuth"), {
  ssr: false,
  loading: () => (
    <div className="w-full flex flex-col items-center justify-center p-8 text-neutral-400 text-[13px]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-blush border-r-transparent mb-3" />
      Loading secure connection...
    </div>
  )
});

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"choice" | "google" | "phone">("choice");
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loginImage, setLoginImage] = useState("/mother-baby.jpg");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";

  useEffect(() => {
    setIsMounted(true);
    
    // Fetch dynamic login image from backend
    fetch("/api/settings/login-page")
      .then(res => res.json())
      .then(data => {
        if (data.config && data.config.imageUrl) {
          setLoginImage(data.config.imageUrl);
        }
      })
      .catch(console.error);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loginWithGoogle();
      const googleProvider = result.user.providerData.find(p => p.providerId === 'google.com');
      const userEmail = result.user.email || googleProvider?.email || null;
      const userDisplayName = result.user.displayName || googleProvider?.displayName || null;

      if (!userEmail || !userDisplayName) {
        toast.error("Unable to retrieve profile info from Google.");
        setLoading(false);
        return;
      }

      const token = await result.user.getIdToken(true);
      await fetch("/api/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ uid: result.user.uid, email: userEmail, name: userDisplayName, provider: "google" }),
      });

      toast.success("Welcome back!");
      router.push(redirectPath);
    } catch (err: any) {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSuccess = async (user: any) => {
    try {
      const token = await user.getIdToken(true);
      await fetch("/api/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          uid: user.uid,
          phone: user.phoneNumber,
          name: user.displayName || "User",
          provider: "phone"
        }),
      });
      router.push(redirectPath);
    } catch (err) {
      console.error("Phone sync failed:", err);
      router.push(redirectPath); // Proceed anyway
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4EE] flex flex-col selection:bg-[#C8B273]/20 relative overflow-hidden" suppressHydrationWarning>
      {/* Subtle Background Radial Depth */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: `radial-gradient(circle at top left, rgba(200, 178, 115, 0.10), transparent 42%)`
          }}
        />
      </div>

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 md:px-10 pt-32 lg:pt-40 pb-20">
        {/* PREMIUM AUTH SHELL */}
        <section
          className="premium-auth-shell w-full max-w-[1480px] mx-auto p-6 md:p-12 lg:p-[48px] rounded-[28px] md:rounded-[42px] border border-black/5 backdrop-blur-[12px] relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          style={{
            background: `rgba(255, 255, 255, 0.58)`
          }}
        >
          <div className="premium-auth-grid grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px] gap-12 md:gap-[48px] items-center w-full relative">

            {/* LEFT: BRAND PANEL */}
            <div className="brand-panel flex flex-col items-start justify-center space-y-10 lg:space-y-12">
              <div className="brand-content w-full space-y-8 text-left">
                {/* Eyebrow Label - Refined Visibility */}
                <div
                  className="inline-flex items-center px-[18px] py-[10px] rounded-full shadow-sm"
                  style={{ backgroundColor: 'rgba(200, 178, 115, 0.12)' }}
                >
                  <span className="text-[11px] md:text-[12px] font-black uppercase tracking-[2px] text-[#C8B273]">
                    Premium Maternity & Kids
                  </span>
                </div>

                {/* Main Heading - High Visibility Scale */}
                <div className="space-y-6">
                  <h1
                    className="brand-heading font-serif font-bold tracking-tight leading-[1.04]"
                    style={{ fontSize: 'clamp(52px, 5.5vw, 84px)', maxWidth: '640px', color: '#3B312C', letterSpacing: '-0.03em' }}
                  >
                    Premium Essentials <br className="hidden md:block" />
                    for <span style={{ color: '#C8B273' }}>Motherhood</span>
                  </h1>
                  <p
                    className="brand-description font-sans font-medium leading-[1.7]"
                    style={{ fontSize: '20px', maxWidth: '520px', color: '#B8A89A' }}
                  >
                    Sign in to continue your premium shopping experience for motherhood and little ones.
                  </p>
                </div>

                {/* Trust Signals - High Contrast Mini Cards */}
                <div className="trust-grid grid grid-cols-3 gap-[18px] w-full max-w-[580px]">
                  {[
                    { icon: ShieldCheck, title: "Secure Shopping", desc: "Your data is protected" },
                    { icon: User, title: "Trusted by Moms", desc: "Loved by thousands" },
                    { icon: RefreshCw, title: "Easy Returns", desc: "Simple 7-day returns" },
                  ].map((item, i) => (
                    <div key={i} className="trust-card bg-white/72 border border-black/5 rounded-[22px] p-5 shadow-[0_4px_14px_rgba(0,0,0,0.04)] backdrop-blur-[8px] flex flex-col justify-between min-h-[120px] text-left">
                      <div className="w-[22px] h-[22px] text-[#C8B273]">
                        <item.icon className="w-full h-full" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none" style={{ color: '#3B312C' }}>{item.title}</p>
                        <p className="text-[9px] font-bold leading-relaxed" style={{ color: '#B8A89A' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Anchor Image with Premium Masking */}
              <div className="brand-image-wrapper relative w-full max-w-[460px] aspect-[16/9] rounded-[32px] overflow-hidden opacity-[0.94] mt-8 hidden md:block group shadow-premium border border-white/40 after:content-[''] after:absolute after:inset-0 after:bg-gradient-to-t after:from-[#F8F4EE] after:via-transparent after:to-transparent after:opacity-40">
                <Image
                  src={loginImage}
                  alt="Premium lifestyle"
                  fill
                  priority
                  sizes="460px"
                  className="object-cover object-top transition-transform duration-[4s] group-hover:scale-105"
                />
              </div>
            </div>

            {/* RIGHT: AUTH PANEL (Login Card) */}
            <div className="auth-panel relative flex justify-center lg:justify-start">
              <div
                className="premium-auth-card rounded-[32px] md:rounded-[42px] p-8 md:p-12 w-full max-w-[460px] relative overflow-hidden flex flex-col gap-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] transform lg:translate-y-[8px]"
                style={{
                  background: 'rgba(255, 255, 255, 0.94)',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div className="relative z-10 flex flex-col items-center text-center">
                  {/* Auth Icon */}
                  <div className="auth-icon w-[72px] h-[72px] rounded-full bg-[#C8B273]/[0.12] flex items-center justify-center mb-10 shadow-sm">
                    <User className="w-8 h-8 text-[#C8B273]" strokeWidth={1} />
                  </div>

                  {/* Auth Heading */}
                  <h2 className="auth-heading text-[38px] md:text-[48px] font-serif font-bold mb-3 tracking-tight leading-[1.1]" style={{ color: '#3B312C' }}>
                    Welcome <span className="text-[#C8B273] italic font-normal">Back</span>
                  </h2>

                  {/* Auth Description */}
                  <p className="auth-description text-[17px] font-sans font-medium mb-12 leading-[1.7] max-w-[280px] mx-auto" style={{ color: '#B8A89A' }}>
                    Sign in to your account and continue shopping for your baby.
                  </p>

                  <div className="w-full">
                    {authMethod === "choice" ? (
                      <div className="flex flex-col gap-6">
                        {/* Google Button - Premium Layout */}
                        <button
                          onClick={handleGoogleLogin}
                          disabled={loading}
                          className="google-btn relative w-full h-[58px] rounded-[20px] bg-gradient-to-br from-[#C8B273] to-[#B89B5E] text-white hover:shadow-[0_12px_24px_rgba(200,178,115,0.18)] hover:-translate-y-[1px] transition-all duration-300 active:scale-[0.98] disabled:opacity-80 flex items-center overflow-hidden group"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                            <>
                              <div className="absolute left-4 md:left-5 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                                <svg viewBox="0 0 24 24" className="w-full h-full"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                              </div>
                              <div className="flex-1 text-center px-12 md:px-14">
                                <span className="text-[14px] md:text-[15px] whitespace-nowrap font-bold tracking-wide">Continue with Google</span>
                              </div>
                              <ArrowRight className="absolute right-4 md:right-5 w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1 opacity-80" />
                            </>
                          )}
                        </button>

                        <div className="divider relative py-1 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/[0.06]"></div></div>
                          <span className="relative px-4 bg-white text-[#B8A89A] font-bold text-[10px] uppercase tracking-[0.2em]">or</span>
                        </div>

                        {/* Phone Button - Premium Layout */}
                        <button
                          onClick={() => setAuthMethod("phone")}
                          className="otp-btn relative w-full h-[58px] rounded-[20px] bg-white border border-[rgba(200,178,115,0.3)] text-[#3B312C] hover:bg-[#FFF9EC] hover:border-[#C8B273] transition-all duration-300 active:scale-[0.98] flex items-center overflow-hidden group"
                        >
                          <div className="absolute left-4 md:left-5 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                            <Phone className="w-5 h-5 md:w-6 md:h-6 text-[#C8B273]" />
                          </div>
                          <div className="flex-1 text-center px-12 md:px-14">
                            <span className="text-[14px] md:text-[15px] whitespace-nowrap font-bold tracking-wide">Continue with Phone</span>
                          </div>
                          <ArrowRight className="absolute right-4 md:right-5 w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1 opacity-40 text-[#B8A89A]" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full space-y-8">
                        <button
                          onClick={() => { setError(null); setAuthMethod("choice"); }}
                          className="flex items-center gap-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#B8A89A] hover:text-[#C8B273] transition-colors mx-auto"
                        >
                          <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 rotate-180" />
                          Back to options
                        </button>
                        <PhoneAuth onSuccess={handlePhoneSuccess} />
                      </div>
                    )}
                  </div>

                  <div className="mt-16 flex flex-col items-center">
                    <p className="terms-text text-[13px] text-neutral-400 text-center leading-[1.6] opacity-70">
                      By continuing, you agree to our <br />
                      <Link href="/terms" className="text-[#C8B273] font-black uppercase tracking-widest hover:underline underline-offset-4 decoration-2">Terms & Conditions</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white font-serif italic text-2xl text-[#C8B273]">
        Loading...
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
