"use client";

import { initAppCheck } from "./firebase";

let initialized = false;

export function initFirebaseClient() {
  if (initialized) return;
  initialized = true;

  // Initialize App Check slightly later to avoid blocking initial hydration
  setTimeout(() => {
    initAppCheck();
  }, 500);
}
