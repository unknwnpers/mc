"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FlashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const router = useRouter();

  // Minimum swipe distance (in px) to trigger dismiss
  const minSwipeDistance = 50;

  useEffect(() => {
    // Show the flash screen shortly after the app loads
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setIsVisible(false);
  };

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
      dismiss();
    }
  };

  const handleImageClick = () => {
    dismiss();
    router.push("/products");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="relative max-w-4xl w-full mx-auto animate-in zoom-in-95 duration-500 rounded-3xl overflow-hidden shadow-2xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="absolute top-4 right-4 z-10 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 backdrop-blur-md transition-all active:scale-95"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Clickable Image Area */}
        <div 
          onClick={handleImageClick}
          className="cursor-pointer relative w-full flex items-center justify-center bg-transparent group"
        >
          {/* Desktop Image (Hidden on Mobile) */}
          <div className="hidden md:block w-full">
            <Image 
              src="/Flash Screen Desktop.png" 
              alt="Grand Opening Offer" 
              width={1200} 
              height={600} 
              className="w-full h-auto object-contain rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.2)] group-hover:scale-[1.01] transition-transform duration-500"
              priority
            />
          </div>

          {/* Mobile Image (Hidden on Desktop) */}
          <div className="block md:hidden w-full">
            <Image 
              src="/Flash Screen Mobile.png" 
              alt="Grand Opening Offer" 
              width={600} 
              height={1200} 
              className="w-full h-auto object-contain rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              priority
            />
          </div>
          
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
