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

  // Initialize invisible reCAPTCHA once on mount
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
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
  }

  async function initVerifier() {
    const auth = getFirebaseAuth();
    if (!auth || typeof window === "undefined") return;

    clearVerifier();

    const siteKey =
      process.env.NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY ||
      process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      console.error("[PhoneAuth] No reCAPTCHA site key found in environment variables.");
      return;
    }

    try {
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",           // INVISIBLE — no checkbox shown to user
        sitekey: siteKey,
        callback: () => {
          console.log("[PhoneAuth] reCAPTCHA solved");
        },
        "expired-callback": () => {
          console.warn("[PhoneAuth] reCAPTCHA expired — re-initializing");
          if (isMounted.current) initVerifier();
        },
      });

      await verifier.render();

      if (isMounted.current) {
        window.recaptchaVerifier = verifier;
        console.log("[PhoneAuth] Invisible reCAPTCHA ready");
      }
    } catch (err: any) {
      console.error("[PhoneAuth] reCAPTCHA init failed:", err.message);
      if (isMounted.current) {
        setError("Security check failed to load. Please refresh the page.");
      }
    }
  }

  // Validate Indian phone number
  function validatePhone(raw: string): { valid: boolean; formatted: string; error?: string } {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12)
      return { valid: true, formatted: `+${digits}` };
    if (digits.length === 10 && /^[6-9]/.test(digits))
      return { valid: true, formatted: `+91${digits}` };
    if (digits.length < 10) return { valid: false, formatted: "", error: "Phone number too short" };
    return { valid: false, formatted: "", error: "Invalid Indian phone number" };
  }

  // Send OTP
  async function sendOTP() {
    setError(null);

    const validation = validatePhone(phone);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    if (!window.recaptchaVerifier) {
      setError("Security check not ready. Please wait a moment and try again.");
      // Try re-initializing
      await initVerifier();
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase Auth not initialized");

      console.log("[PhoneAuth] Sending OTP to:", validation.formatted);

      // signInWithPhoneNumber handles reCAPTCHA token generation internally
      const result = await signInWithPhoneNumber(
        auth,
        validation.formatted,
        window.recaptchaVerifier
      );

      window.confirmationResult = result;
      setStep("otp");
      setTimer(30);
      toast.success("OTP sent to your mobile!");
    } catch (err: any) {
      console.error("[PhoneAuth] sendOTP error:", err.code, err.message);
      handleError(err);

      // Re-initialize reCAPTCHA cleanly after failure — NO page reload
      await initVerifier();
    } finally {
      setLoading(false);
    }
  }

  // Verify OTP
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

      // Small delay to allow AuthContext to pick up the new user state
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
      "auth/captcha-check-failed": "Security check failed. Please refresh.",
      "auth/missing-recaptcha-token": "Security token missing. Refreshing security check...",
      "auth/invalid-recaptcha-token": "Security token mismatch. Refreshing security check...",
      "auth/invalid-app-credential": "App credential error. Ensure your domain is authorized in Firebase Console.",
    };

    const message = messages[code] || err.message || "An unexpected error occurred.";
    setError(message);
    toast.error(message);
  }

  async function resendOTP() {
    if (timer > 0) return;
    setOtp("");
    setStep("phone");
    // Wait for DOM to update before re-sending
    setTimeout(() => sendOTP(), 100);
  }

  return (
    <div className="w-full">
      {step === "phone" && (
        <div className="space-y-4">
          {/* Phone input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Phone className="w-5 h-5" />
            </div>
            <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-sm">
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
              placeholder="10-digit mobile number"
              className="w-full pl-20 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-blush focus:ring-2 focus:ring-blush/20 outline-none text-lg font-medium transition-all"
              autoComplete="tel"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="send-otp-btn"
            onClick={sendOTP}
            disabled={loading || phone.length < 10 || lockoutTimer > 0}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : lockoutTimer > 0 ? (
              <span>Wait {formatTime(lockoutTimer)}</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Send OTP</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-gray-500 text-sm">
              Code sent to <span className="font-semibold">+91 {phone}</span>
            </p>
            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
              className="text-blush text-xs font-bold hover:underline mt-1"
            >
              Change number
            </button>
          </div>

          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
            placeholder="6-digit OTP"
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:border-blush outline-none text-2xl font-bold tracking-[0.5em] text-center transition-all"
            autoFocus
            autoComplete="one-time-code"
          />

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="verify-otp-btn"
            onClick={verifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span>Verify OTP</span>
            )}
          </button>

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-gray-400 text-xs">Resend code in {timer}s</p>
            ) : (
              <button
                onClick={resendOTP}
                className="text-blush text-xs font-bold flex items-center gap-1 mx-auto hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/*
        INVISIBLE reCAPTCHA container.
        Must exist in DOM at all times. Using fixed 1×1 off-screen placement
        so Firebase can attach the invisible widget without layout disruption.
      */}
      <div
        id="recaptcha-container"
        className="fixed bottom-0 right-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}
