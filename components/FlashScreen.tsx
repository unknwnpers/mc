// "use client";

// import { useState, useEffect } from "react";
// import { X } from "lucide-react";
// import { useRouter } from "next/navigation";

// export default function FlashScreen() {
//   const [isVisible, setIsVisible] = useState(false);
//   const router = useRouter();

//   useEffect(() => {
//     // Check session storage immediately on client load
//     const hasSeen = sessionStorage.getItem("flash_seen_offer");
//     if (!hasSeen) {
//       setIsVisible(true);
//       sessionStorage.setItem("flash_seen_offer", "true");
//     }
//   }, []);

//   if (!isVisible) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-500">
//       <div className="relative w-full max-w-[90vw] md:max-w-4xl mx-auto rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">

//         {/* Close Button */}
//         <button
//           onClick={(e) => {
//             e.stopPropagation();
//             setIsVisible(false);
//           }}
//           className="absolute top-3 right-3 md:top-4 md:right-4 z-50 bg-black/30 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition-all active:scale-90"
//           aria-label="Close"
//         >
//           <X className="w-5 h-5 md:w-6 md:h-6" />
//         </button>

//         {/* Clickable Image Area */}
//         <div
//           onClick={() => {
//             setIsVisible(false);
//             router.push("/products");
//           }}
//           className="cursor-pointer relative w-full flex items-center justify-center bg-transparent group"
//         >
//           {/* Desktop Image (Hidden on Mobile) */}
//           <img
//             src="/flash_screen_desktop.png"
//             alt="Grand Opening Offer"
//             width={1024}
//             height={768}
//             className="hidden md:block w-full h-auto object-contain rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.2)] group-hover:scale-[1.01] transition-transform duration-50000"
//           />

//           {/* Mobile Image (Hidden on Desktop) */}
//           <img
//             src="/flash_screen_mobile.png"
//             alt="Grand Opening Offer"
//             className="block md:hidden w-full h-auto object-contain rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.2)]"
//           />
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function FlashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  // Touch tracking
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("flash_seen_offer");
    if (!hasSeen) {
      setIsVisible(true);
      sessionStorage.setItem("flash_seen_offer", "true");
    }
  }, []);

  const closeAndRedirect = () => {
    setIsVisible(false);
    router.push("/");
  };

  // Swipe detection
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const distance = touchStartY.current - touchEndY.current;

    // 👇 Threshold (adjust if needed)
    if (Math.abs(distance) > 80) {
      closeAndRedirect();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm">

      {/* Close Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-md transition active:scale-90"
      >
        <X className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      {/* Interactive Area */}
      <div
        onClick={closeAndRedirect}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-screen h-screen cursor-pointer"
      >
        {/* Desktop */}
        <div className="hidden md:block relative w-full h-full">
          <Image
            src="/flash_screen_desktop.png"
            alt="Offer"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Mobile */}
        <div className="block md:hidden relative w-full h-full">
          <Image
            src="/flash_screen_mobile.png"
            alt="Offer"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}