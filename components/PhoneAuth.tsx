"use client";

import { useState, useEffect, useRef } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User
} from "firebase/auth";
import { toast } from "sonner";
import { Phone, ArrowRight, Loader2, RefreshCw, ShieldCheck, Clock, AlertCircle } from "lucide-react";

// Extend Window type for recaptcha
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

export default function PhoneAuth({ onSuccess, redirectPath = "/" }: PhoneAuthProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  // 1. Stable reCAPTCHA Initialization (Single Instance)
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth || typeof window === "undefined") return;

    if (!window.recaptchaVerifier) {
      console.log("[PhoneAuth] Initializing singleton RecaptchaVerifier");

      const v2SiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY;

      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        ...(v2SiteKey ? { sitekey: v2SiteKey } : {}),
        callback: () => {
          console.log("[PhoneAuth] reCAPTCHA verified");
        }
      });

      window.recaptchaVerifier.render()
        .then(() => console.log("[PhoneAuth] reCAPTCHA ready"))
        .catch(err => console.error("[PhoneAuth] reCAPTCHA render error:", err));
    }

    verifierRef.current = window.recaptchaVerifier;

    return () => {
      // CRITICAL: We do NOT clear the verifier here. 
      // Re-using the same instance prevents token race conditions in React.
    };
  }, []);

  // 2. Timers for resend/lockout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 || lockoutTimer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => Math.max(0, prev - 1));
        setLockoutTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, lockoutTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return { valid: true, formatted: `+${digits}` };
    if (digits.length === 10 && /^[6-9]/.test(digits)) return { valid: true, formatted: `+91${digits}` };
    if (digits.length < 10) return { valid: false, formatted: "", error: "Phone number is too short" };
    if (digits.length > 12) return { valid: false, formatted: "", error: "Phone number is too long" };
    return { valid: false, formatted: "", error: "Invalid Indian phone number" };
  };

  const sendOTP = async () => {
    setError(null);
    const validation = validatePhone(phone);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    const appVerifier = window.recaptchaVerifier || verifierRef.current;
    if (!appVerifier) {
      toast.error("Security check not ready. Please refresh.");
      return;
    }

    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth instance not found");

      const formattedPhone = validation.formatted;
      console.log("[PhoneAuth] Calling signInWithPhoneNumber for:", formattedPhone);

      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      window.confirmationResult = result;

      setStep("otp");
      setTimer(30);
      toast.success("OTP sent to your mobile");
    } catch (err: any) {
      console.error("[PhoneAuth] sendOTP error:", err.code, err.message);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!window.confirmationResult) {
        throw new Error("Verification session expired. Please resend OTP.");
      }

      const result = await window.confirmationResult.confirm(otp);
      toast.success("Verified successfully!");

      if (onSuccess) onSuccess(result.user);
    } catch (err: any) {
      console.error("[PhoneAuth] verifyOTP error:", err.code, err.message);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: any) => {
    const code = err.code || "";

    if (code === "auth/too-many-requests") {
      setLockoutTimer(900); // 15 min
      setError("Security block: Too many attempts. Please try again after 15 minutes.");
      return;
    }

    const errorMessages: Record<string, string> = {
      "auth/invalid-phone-number": "The phone number is invalid.",
      "auth/quota-exceeded": "SMS limit reached. Please try Google login.",
      "auth/invalid-verification-code": "Incorrect OTP. Please check and try again.",
      "auth/code-expired": "OTP has expired. Please request a new one.",
      "auth/captcha-check-failed": "Security check failed. Please refresh.",
      "auth/missing-recaptcha-token": "Security token missing or invalid key. Please refresh.",
      "auth/invalid-app-credential": "App credential invalid. Ensure domain is authorized in Firebase Console.",
      "auth/firebase-app-check-token-is-invalid": "Security handshake failed. If testing on localhost, ensure your debug token is registered in Firebase Console.",
    };

    const message = errorMessages[code] || err.message || "An unexpected error occurred.";
    setError(message);
    toast.error(message);
  };

  const resendOTP = async () => {
    if (timer > 0) return;
    setOtp("");
    await sendOTP();
  };

  return (
    <div className="w-full">
      {step === "phone" && (
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Phone className="w-5 h-5" />
            </div>
            <div className="absolute left-12 top-1/2 -translate-y-1/2 text-charcoal font-bold border-r border-gray-200 pr-3">
              +91
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
              placeholder="Mobile number"
              className="w-full pl-20 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-blush focus:ring-2 focus:ring-blush/20 outline-none text-lg font-medium transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
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
                <span>Get OTP</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <p className="text-gray-500 text-sm">Code sent to +91 {phone}</p>
            <button onClick={() => setStep("phone")} className="text-blush text-xs font-bold hover:underline">Change number</button>
          </div>

          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit OTP"
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:border-blush outline-none text-2xl font-bold tracking-[0.5em] text-center transition-all"
            autoFocus
          />

          <button
            onClick={verifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify OTP</span>}
          </button>

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-gray-400 text-xs">Resend code in {timer}s</p>
            ) : (
              <button onClick={resendOTP} className="text-blush text-xs font-bold flex items-center gap-1 mx-auto hover:underline">
                <RefreshCw className="w-3 h-3" /> Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* 
          CRITICAL: reCAPTCHA container. 
          Must exist exactly once in the DOM. 
      */}
      <div id="recaptcha-container" className="flex justify-center mt-2 min-h-[1px]" />
    </div>
  );
}
