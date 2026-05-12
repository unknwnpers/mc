"use client";

import { useState, useEffect, useRef } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User,
} from "firebase/auth";
import { toast } from "sonner";
import {
  Phone,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
    confirmationResult: ConfirmationResult | null;
  }
}

interface PhoneAuthProps {
  onSuccess?: (user: User) => void;
  redirectPath?: string;
}

export default function PhoneAuth({ onSuccess }: PhoneAuthProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0 && lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => Math.max(0, t - 1));
      setLockoutTimer((lt) => Math.max(0, lt - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, lockoutTimer]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // Initialize reCAPTCHA on mount
  useEffect(() => {
    isMounted.current = true;
    initVerifier();
    return () => {
      isMounted.current = false;
      clearVerifier();
    };
  }, []);

  function clearVerifier() {
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch (_) {}
      window.recaptchaVerifier = null;
    }
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
  }

  async function initVerifier(): Promise<RecaptchaVerifier | null> {
    const auth = getFirebaseAuth();
    if (!auth || typeof window === "undefined") return null;

    clearVerifier();

    const auth2 = getFirebaseAuth()!;

    /**
     * STRATEGY: Try Enterprise Managed mode first (no sitekey).
     * Firebase projects with reCAPTCHA Enterprise REQUIRE this — passing
     * a V2 sitekey to RecaptchaVerifier on Enterprise projects throws an error.
     *
     * If Enterprise isn't configured, we fall back to an explicit sitekey.
     */
    try {
      console.log("[PhoneAuth] Trying Enterprise managed mode (no sitekey)...");
      const verifier = new RecaptchaVerifier(auth2, "recaptcha-container", {
        size: "invisible",
        callback: () => console.log("[PhoneAuth] reCAPTCHA solved (Enterprise)"),
        "expired-callback": () => {
          console.warn("[PhoneAuth] reCAPTCHA expired");
          if (isMounted.current) initVerifier();
        },
      });
      await verifier.render();

      if (isMounted.current) {
        window.recaptchaVerifier = verifier;
        console.log("[PhoneAuth] ✅ Enterprise managed reCAPTCHA ready");
      }
      return verifier;
    } catch (enterpriseErr: any) {
      console.warn("[PhoneAuth] Enterprise mode failed:", enterpriseErr.message);
      clearVerifier();
    }

    // Fallback: use explicit V2 invisible sitekey
    const siteKey =
      process.env.NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY ||
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      console.error("[PhoneAuth] No reCAPTCHA site key in environment. Set NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY.");
      return null;
    }

    try {
      console.log("[PhoneAuth] Trying V2 invisible mode with sitekey...");
      const verifier = new RecaptchaVerifier(auth2, "recaptcha-container", {
        size: "invisible",
        sitekey: siteKey,
        callback: () => console.log("[PhoneAuth] reCAPTCHA solved (V2)"),
        "expired-callback": () => {
          console.warn("[PhoneAuth] reCAPTCHA expired");
          if (isMounted.current) initVerifier();
        },
      });
      await verifier.render();

      if (isMounted.current) {
        window.recaptchaVerifier = verifier;
        console.log("[PhoneAuth] ✅ V2 invisible reCAPTCHA ready");
      }
      return verifier;
    } catch (v2Err: any) {
      console.error("[PhoneAuth] V2 mode also failed:", v2Err.message);
      return null;
    }
  }

  // Validate Indian phone number
  function validatePhone(raw: string): { valid: boolean; formatted: string; error?: string } {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12)
      return { valid: true, formatted: `+${digits}` };
    if (digits.length === 10 && /^[6-9]/.test(digits))
      return { valid: true, formatted: `+91${digits}` };
    if (digits.length < 10)
      return { valid: false, formatted: "", error: "Phone number too short" };
    return { valid: false, formatted: "", error: "Invalid Indian phone number" };
  }

  async function sendOTP() {
    setError(null);

    const validation = validatePhone(phone);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase Auth not initialized");

      // Ensure verifier is ready — initialize on-demand if not
      let appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        console.log("[PhoneAuth] Verifier not ready, initializing now...");
        appVerifier = await initVerifier();
      }

      if (!appVerifier) {
        throw new Error(
          "Security check could not be loaded. Please check your internet connection or disable VPN/ad-blockers and try again."
        );
      }

      console.log("[PhoneAuth] Sending OTP to:", validation.formatted);

      // Let signInWithPhoneNumber internally call reCAPTCHA with the correct action
      const result = await signInWithPhoneNumber(
        auth,
        validation.formatted,
        appVerifier
      );

      window.confirmationResult = result;
      setStep("otp");
      setTimer(30);
      toast.success("OTP sent to your mobile!");
    } catch (err: any) {
      console.error("[PhoneAuth] sendOTP error:", err.code, err.message);
      handleError(err);
      // Re-init cleanly for retry — no page reload
      clearVerifier();
      setTimeout(() => initVerifier(), 300);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP() {
    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (!window.confirmationResult) {
      setError("Session expired. Please request a new OTP.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.confirmationResult.confirm(otp);
      toast.success("Phone verified successfully!");
      // Delay to allow AuthContext to propagate the new user state
      setTimeout(() => {
        if (onSuccess) onSuccess(result.user);
      }, 500);
    } catch (err: any) {
      console.error("[PhoneAuth] verifyOTP error:", err.code, err.message);
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleError(err: any) {
    const code = err?.code || "";

    if (code === "auth/too-many-requests") {
      setLockoutTimer(900);
      setError("Too many attempts. Please wait 15 minutes before trying again.");
      return;
    }

    const messages: Record<string, string> = {
      "auth/invalid-phone-number": "The phone number is not valid.",
      "auth/quota-exceeded": "SMS quota exceeded. Please try Google sign-in.",
      "auth/invalid-verification-code": "Incorrect OTP. Please try again.",
      "auth/code-expired": "OTP has expired. Please request a new one.",
      "auth/captcha-check-failed": "Security check failed. Please try again.",
      "auth/missing-recaptcha-token": "Security token missing. Please try again.",
      "auth/invalid-recaptcha-token": "Security token mismatch. Please try again.",
      "auth/invalid-app-credential":
        "Domain not authorized. Please ensure your domain is added to Firebase Console → Authentication → Settings → Authorized domains.",
    };

    const message =
      messages[code] ||
      err.message ||
      "An unexpected error occurred. Please try again.";
    setError(message);
    toast.error(message);
  }

  function resendOTP() {
    if (timer > 0) return;
    setOtp("");
    setStep("phone");
    setTimeout(() => sendOTP(), 150);
  }

  return (
    <div className="w-full">
      {step === "phone" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-2">Mobile Number</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-300 group-focus-within:text-blush transition-colors">
                <Phone className="w-4 h-4" />
              </div>
              <span className="absolute left-12 top-1/2 -translate-y-1/2 text-charcoal font-bold text-sm">
                +91
              </span>
              <input
                id="phone-input"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                placeholder="10-digit number"
                className="w-full pl-20 pr-5 py-5 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 transition-all font-bold text-charcoal placeholder:text-neutral-300 text-sm shadow-sm"
                autoComplete="tel"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            id="send-otp-btn"
            onClick={sendOTP}
            disabled={loading || phone.length < 10 || lockoutTimer > 0}
            className="w-full h-[64px] flex items-center justify-center gap-3 bg-blush text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/20 active:scale-[0.98] disabled:opacity-50 group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : lockoutTimer > 0 ? (
              <span>Wait {formatTime(lockoutTimer)}</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Send OTP Code</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-6">
          <div className="text-center bg-cream/30 p-4 rounded-2xl border border-blush/5">
            <p className="text-neutral-500 text-xs font-medium">
              We've sent a code to <span className="font-bold text-charcoal">+91 {phone}</span>
            </p>
            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
              className="text-blush text-[10px] font-black uppercase tracking-widest hover:underline mt-2"
            >
              Change Number
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] ml-2">Verification Code</label>
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
              placeholder="000000"
              className="w-full px-5 py-5 bg-neutral-50 border-none rounded-2xl focus:ring-2 focus:ring-blush/20 outline-none text-2xl font-bold tracking-[0.5em] text-center text-charcoal transition-all shadow-sm placeholder:text-neutral-200"
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <button
            id="verify-otp-btn"
            onClick={verifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full h-[64px] flex items-center justify-center gap-3 bg-blush text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#f48c82] transition-all shadow-xl shadow-blush/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Continue</span>
              </>
            )}
          </button>

          <div className="text-center">
            {timer > 0 ? (
              <div className="flex items-center justify-center gap-2 text-neutral-400 text-[10px] font-bold uppercase tracking-widest">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Resend in {timer}s
              </div>
            ) : (
              <button
                onClick={resendOTP}
                className="text-blush text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:underline decoration-2"
              >
                <RefreshCw className="w-3 h-3" />
                Resend Code Now
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        INVISIBLE reCAPTCHA container.
        Fixed 1×1 off-screen — Firebase needs it in DOM but it must not be visible.
        DO NOT use display:none — that breaks invisible reCAPTCHA on mobile.
      */}
      <div
        id="recaptcha-container"
        className="fixed bottom-0 right-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
