"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("[Web Vitals]", metric.name, metric.value);
    }

    // Send to Google Analytics 4
    if (typeof window !== "undefined" && (window as any).gtag) {
      const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
      if (GA_ID) {
        (window as any).gtag("event", metric.name, {
          value: Math.round(
            metric.name === "CLS" ? metric.value * 1000 : metric.value
          ),
          event_category: "Web Vitals",
          event_label: metric.id,
          non_interaction: true,
        });
      }
    }

    // Alert on poor performance
    const thresholds: Record<string, number> = {
      LCP: 4000, // 4 seconds
      FID: 300, // 300ms
      CLS: 0.25, // 0.25
      INP: 500, // 500ms
      TTFB: 1800, // 1.8 seconds
    };

    if (
      thresholds[metric.name] &&
      metric.value > thresholds[metric.name]
    ) {
      console.warn(`[Web Vitals] Poor ${metric.name}: ${metric.value}`);
    }
  });

  return null;
}
