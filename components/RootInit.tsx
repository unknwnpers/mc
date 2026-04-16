"use client";

import { useEffect } from "react";
import { initFirebaseClient } from "@/lib/firebase-init";

export default function RootInit() {
  useEffect(() => {
    initFirebaseClient();
  }, []);

  return null;
}
