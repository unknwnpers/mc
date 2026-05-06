"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  initializeRecaptchaConfig,
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
  const [isVerifierReady, setIsVerifierReady] = useState(false);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  // 1. Countdown timer for resend and lockout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 || lockoutTimer > 0) {
      interval = setInterval(() => {
        setTimer((t) => (t > 0 ? t - 1 : 0));
        setLockoutTimer((lt) => (lt > 0 ? lt - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, lockoutTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 2. Stable reCAPTCHA Initialization (ON MOUNT ONLY)
   * This prevents "missing-recaptcha-token" errors caused by resetting the verifier
   */
  useEffect(() => {
    let isMounted = true;

    async function initVerifier() {
      const auth = getFirebaseAuth();
      if (!auth || typeof window === "undefined") return;

      const container = document.getElementById("recaptcha-container");
      if (!container) {
        console.error("[PhoneAuth] reCAPTCHA container missing on mount");
        return;
      }

      // Avoid double initialization in React StrictMode
      if (window.recaptchaVerifier || verifierRef.current) {
        console.log("[PhoneAuth] reCAPTCHA already initialized, skipping...");
        setIsVerifierReady(true);
        return;
      }

      try {
        const v2SiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY;
        if (!v2SiteKey) {
          throw new Error("Phone Auth configuration (V2 Site Key) is missing");
        }

        console.log("[PhoneAuth] Initializing stable RecaptchaVerifier...");

        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
          sitekey: v2SiteKey,
          callback: (response: any) => {
            console.log("[PhoneAuth] reCAPTCHA challenge solved successfully");
          },
          'expired-callback': () => {
            console.warn("[PhoneAuth] reCAPTCHA expired, please try again");
            toast.error("Verification expired. Please try again.");
          }
        });

        // Wait for rendering to complete before allowing usage
        await verifier.render();

        if (isMounted) {
          verifierRef.current = verifier;
          window.recaptchaVerifier = verifier;
          setIsVerifierReady(true);
          console.log("[PhoneAuth] reCAPTCHA is ready and rendered");
        }
      } catch (err: any) {
        console.error("[PhoneAuth] Verifier initialization failed:", err);
        if (isMounted) setError(err.message);
      }
    }

    initVerifier();

    return () => {
      isMounted = false;
      // We DO NOT clear the verifier here because Next.js sometimes triggers
      // fast-refresh or double-mounts that would break the lifecycle.
      // The singleton check above handles reuse.
    };
  }, []);

  // Validate Indian phone number
  const validatePhone = (phone: string): { valid: boolean; formatted: string; error?: string } => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length === 12) return { valid: true, formatted: `+${digits}` };
    if (digits.length === 10 && /^[6-9]/.test(digits)) return { valid: true, formatted: `+91${digits}` };
    if (digits.length < 10) return { valid: false, formatted: "", error: "Phone number is too short" };
    if (digits.length > 12) return { valid: false, formatted: "", error: "Phone number is too long" };
    return { valid: false, formatted: "", error: "Invalid Indian phone number" };
  };

  /**
   * 3. Send OTP with authorative verifier check
   */
  const sendOTP = async () => {
    setError(null);
    const validation = validatePhone(phone);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    const appVerifier = window.recaptchaVerifier || verifierRef.current;
    if (!appVerifier || !isVerifierReady) {
      toast.error("Security verification is not ready. Please refresh the page.");
      console.error("[PhoneAuth] Attempted to send OTP before verifier was ready", {
        windowObj: !!window.recaptchaVerifier,
        refObj: !!verifierRef.current,
        readyState: isVerifierReady
      });
      return;
    }

    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth instance not found");

      const formattedPhone = validation.formatted;
      console.log("[PhoneAuth] Initiating OTP send to:", formattedPhone);

      // Verify the state of the verifier before proceeding
      // (Optional: can call await appVerifier.verify() if debugging missing tokens)

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
      "auth/missing-recaptcha-token": "Security token missing. Please refresh and try again.",
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
            <span className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-600 font-medium">
              +91
            </span>
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
            disabled={loading || phone.length < 10 || lockoutTimer > 0 || !isVerifierReady}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : lockoutTimer > 0 ? (
                <span>Wait {formatTime(lockoutTimer)}</span>
            ) : !isVerifierReady ? (
                <span>Loading security...</span>
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
          CRITICAL: Persistent reCAPTCHA container.
          Must stay in DOM for the entire lifecycle of the verifier.
          Positioned slightly visible to ensure challenge puzzles can render if needed.
      */}
      <div
        id="recaptcha-container"
        className="flex justify-center my-2 min-h-[1px]"
      />
    </div>
  );
}
