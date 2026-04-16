"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  User
} from "firebase/auth";
import { toast } from "sonner";
import { Phone, ArrowRight, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const recaptchaInitialized = useRef(false);

  // Countdown timer for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Setup invisible reCAPTCHA
  const setupRecaptcha = useCallback(async () => {
    if (!getFirebaseAuth()) {
      throw new Error("Firebase Auth not initialized");
    }

    if (recaptchaInitialized.current && window.recaptchaVerifier) {
      return window.recaptchaVerifier;
    }

    try {
      // Clear any existing verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          // Ignore
        }
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Auth not available");
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
        "expired-callback": () => {
          setError("reCAPTCHA expired. Please try again.");
          recaptchaInitialized.current = false;
        },
      });

      recaptchaInitialized.current = true;
      return window.recaptchaVerifier;
    } catch (err) {
      console.error("[PhoneAuth] reCAPTCHA setup failed:", err);
      throw new Error("Failed to initialize security verification. Please refresh and try again.");
    }
  }, []);

  // Validate Indian phone number
  const validatePhone = (phone: string): { valid: boolean; formatted: string; error?: string } => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Check if starts with country code
    if (digits.startsWith("91") && digits.length === 12) {
      return { valid: true, formatted: `+${digits}` };
    }

    // If 10 digits, add India country code
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return { valid: true, formatted: `+91${digits}` };
    }

    // Invalid number
    if (digits.length < 10) {
      return { valid: false, formatted: "", error: "Phone number is too short" };
    }
    if (digits.length > 12) {
      return { valid: false, formatted: "", error: "Phone number is too long" };
    }
    if (!digits.startsWith("91") && digits.length === 11) {
      return { valid: false, formatted: "", error: "Please enter a valid 10-digit Indian number" };
    }

    return { valid: false, formatted: "", error: "Invalid phone number format" };
  };

  // Send OTP
  const sendOTP = async () => {
    setError(null);

    // Validate phone
    const validation = validatePhone(phone);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    setLoading(true);

    try {
      const verifier = await setupRecaptcha();
      const formattedPhone = validation.formatted;

      console.log("[PhoneAuth] Sending OTP to:", formattedPhone);

      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Auth not available");
      }
      const result = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      window.confirmationResult = result;

      setStep("otp");
      setTimer(30); // 30 second cooldown
      toast.success("OTP sent successfully!");
    } catch (err: any) {
      console.error("[PhoneAuth] Send OTP error:", err);
      handleError(err);

      // Reset reCAPTCHA on failure
      recaptchaInitialized.current = false;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!window.confirmationResult) {
        throw new Error("Session expired. Please request a new OTP.");
      }

      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;

      // Save user to Firestore via API
      await fetch("/api/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          phone: user.phoneNumber,
          provider: "phone",
        }),
      });

      toast.success("Welcome to MIKS&CHIKS!");

      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err: any) {
      console.error("[PhoneAuth] Verify OTP error:", err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle errors with user-friendly messages
  const handleError = (err: any) => {
    const code = err.code || "";

    const errorMessages: Record<string, string> = {
      "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
      "auth/invalid-phone-number": "Invalid phone number. Please enter a valid Indian number.",
      "auth/missing-phone-number": "Please enter your phone number.",
      "auth/quota-exceeded": "SMS quota exceeded. Please try Google login instead.",
      "auth/invalid-verification-code": "Invalid OTP. Please check and try again.",
      "auth/code-expired": "OTP expired. Please request a new one.",
      "auth/session-expired": "Session expired. Please request a new OTP.",
      "auth/app-verification-failed": "Verification failed. Please refresh the page and try again.",
      "auth/captcha-check-failed": "Security verification failed. Please try again.",
      "auth/invalid-app-credential": "App configuration error. Please contact support.",
    };

    const message = errorMessages[code] || err.message || "Something went wrong. Please try again.";
    setError(message);
    toast.error(message);
  };

  // Resend OTP
  const resendOTP = async () => {
    if (timer > 0) return;
    setOtp("");
    setError(null);
    await sendOTP();
  };

  // Format phone for display
  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    return digits;
  };

  return (
    <div className="w-full">
      {step === "phone" && (
        <div className="space-y-4">
          {/* Phone Input */}
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
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
                setPhone(value);
                setError(null);
              }}
              placeholder="Enter 10-digit mobile number"
              className="w-full pl-20 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-blush focus:ring-2 focus:ring-blush/20 outline-none text-lg font-medium tracking-wide transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          {/* Send OTP Button */}
          <button
            onClick={sendOTP}
            disabled={loading || phone.length < 10}
            className="group w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-blush/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending OTP...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Send OTP</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          {/* OTP Header */}
          <div className="text-center mb-4">
            <p className="text-gray-600">
              OTP sent to <span className="font-bold text-charcoal">+91 {formatPhoneDisplay(phone)}</span>
            </p>
            <button
              onClick={() => {
                setStep("phone");
                setOtp("");
                setError(null);
              }}
              className="text-blush text-sm font-medium hover:underline mt-1"
            >
              Change number
            </button>
          </div>

          {/* OTP Input */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                setError(null);
              }}
              placeholder="Enter 6-digit OTP"
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:border-blush focus:ring-2 focus:ring-blush/20 outline-none text-2xl font-bold tracking-[0.5em] text-center transition-all"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-sm text-center font-medium">{error}</p>
          )}

          {/* Verify Button */}
          <button
            onClick={verifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blush to-rose-400 text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-blush/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify OTP</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Resend OTP */}
          <div className="text-center">
            {timer > 0 ? (
              <p className="text-gray-400 text-sm">
                Resend OTP in <span className="font-bold text-blush">{timer}s</span>
              </p>
            ) : (
              <button
                onClick={resendOTP}
                disabled={loading}
                className="inline-flex items-center gap-2 text-blush font-medium hover:underline disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
