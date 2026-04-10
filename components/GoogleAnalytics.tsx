"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Google Analytics 4 component
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

  // Track page views on route change
  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : "");

    // Push to dataLayer for GA4
    (window as any).gtag?.("config", GA_ID, {
      page_path: url,
    });
  }, [pathname, searchParams, GA_ID]);

  if (!GA_ID) return null;

  return (
    <>
      {/* Google tag (gtag.js) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  );
}
