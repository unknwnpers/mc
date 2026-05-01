"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export interface FlashConfig {
  isActive: boolean;
  desktopImage: string;
  mobileImage: string;
  linkUrl: string;
  updatedAt?: number;
}

export default function FlashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<FlashConfig | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const router = useRouter();

  // Minimum swipe distance (in px) to trigger dismiss
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Dismiss on swipe either left or right
    if (isLeftSwipe || isRightSwipe) {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    async function loadFlashConfig() {
      try {
        // Fetch via Admin SDK API route to completely bypass all client-side Firebase permission errors
        const response = await fetch("/api/settings/flash-screen");
        const data = await response.json();

        let activeConfig: FlashConfig;

        if (response.ok && data.config && data.config.isActive !== false) {
          activeConfig = data.config as FlashConfig;
        } else {
          // Fallback to the uploaded Firebase images if no backend config exists or it's disabled
          activeConfig = {
            isActive: true,
            desktopImage: "https://storage.googleapis.com/miksandchiks-34b66.firebasestorage.app/system/flash-screen/original/1777614706470-flash-screen-desktop.png",
            mobileImage: "https://storage.googleapis.com/miksandchiks-34b66.firebasestorage.app/system/flash-screen/original/1777614800145-flash-screen-mobile.png",
            linkUrl: "/products",
            updatedAt: 1
          };
        }

        if (activeConfig && activeConfig.isActive) {
          setConfig(activeConfig);
          // Use updatedAt in the storage key so if admin updates it, it shows again
          const cacheKey = `flash_seen_${activeConfig.updatedAt || 'v1'}`;
          const hasSeen = sessionStorage.getItem(cacheKey);

          if (!hasSeen) {
            setIsVisible(true);
            sessionStorage.setItem(cacheKey, "true");
          }
        }
      } catch (error) {
        // Silently ignore the Firebase permission error because we have a solid fallback.
        // Ensure the flash screen still works even if Firebase rules block the read
        const fallbackConfig: FlashConfig = {
          isActive: true,
          desktopImage: "https://storage.googleapis.com/miksandchiks-34b66.firebasestorage.app/system/flash-screen/original/1777614706470-flash-screen-desktop.png",
          mobileImage: "https://storage.googleapis.com/miksandchiks-34b66.firebasestorage.app/system/flash-screen/original/1777614800145-flash-screen-mobile.png",
          linkUrl: "/products",
          updatedAt: 1
        };
        
        setConfig(fallbackConfig);
        const cacheKey = `flash_seen_fallback_v1`;
        if (!sessionStorage.getItem(cacheKey)) {
          setIsVisible(true);
          sessionStorage.setItem(cacheKey, "true");
        }
      }
    }

    loadFlashConfig();
  }, []);

  if (!isVisible || !config) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-500">
      <div 
        className="relative w-full max-w-[90vw] md:max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

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
            router.push(config.linkUrl || "/products");
          }}
          className="cursor-pointer relative w-full flex items-center justify-center bg-transparent group"
        >
          {/* Desktop Image (Hidden on Mobile) */}
          <img
            src={config.desktopImage}
            alt="Grand Opening Offer"
            className="hidden md:block w-full h-auto object-contain rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.2)] group-hover:scale-[1.01] transition-transform duration-500"
          />

          {/* Mobile Image (Hidden on Desktop) */}
          <img
            src={config.mobileImage || config.desktopImage}
            alt="Grand Opening Offer"
            className="block md:hidden w-full h-auto object-contain rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          />

          {/* Swipe indicator (mobile only) */}
          <div className="absolute bottom-4 left-0 right-0 text-center md:hidden pointer-events-none opacity-60">
            <span className="bg-black/40 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-sm">
              Swipe or tap to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}