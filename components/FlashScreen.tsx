"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FlashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only show once per session to avoid annoying users
    const hasSeen = sessionStorage.getItem("flash_seen_offer");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        console.log("Flash Screen Triggered");
        setIsVisible(true);
        sessionStorage.setItem("flash_seen_offer", "true");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-500">
      <div className="relative w-full max-w-[90vw] md:max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">

        {/* Close Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-50 bg-black/30 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition-all active:scale-90"
          aria-label="Close"
        >
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* Clickable Image Area */}
        <div
          onClick={() => {
            setIsVisible(false);
            router.push("/products");
          }}
          className="cursor-pointer relative w-full flex items-center justify-center bg-transparent group"
        >
          {/* Desktop Image (Hidden on Mobile) */}
          <img
            src="/Flash_Screen_Desktop.png"
            alt="Grand Opening Offer"
            className="hidden md:block w-full h-auto object-contain rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.2)] group-hover:scale-[1.01] transition-transform duration-500"
          />

          {/* Mobile Image (Hidden on Desktop) */}
          <img
            src="/Flash_Screen_Mobile.png"
            alt="Grand Opening Offer"
            className="block md:hidden w-full h-auto object-contain rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          />
        </div>
      </div>
    </div>
  );
}
