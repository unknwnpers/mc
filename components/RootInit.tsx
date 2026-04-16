"use client";

import { useEffect, useState } from "react";
import { initFirebaseClient } from "@/lib/firebase-init";

export default function RootInit() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      initFirebaseClient();
    } catch (err: any) {
      console.error("[RootInit] Firebase init failed:", err);
      setError(err.message);
    }
  }, []);

  if (error) {
    console.error("[RootInit] Error:", error);
  }

  return null;
}
