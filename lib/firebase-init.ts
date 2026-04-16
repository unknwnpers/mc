"use client";

import { initAppCheck } from "./firebase";

let initialized = false;

export function initFirebaseClient() {
  if (initialized) return;
  initialized = true;

  // Initialize App Check early to avoid race conditions
  initAppCheck();
}
