import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Production-Grade Audit Logger
 * Provides structured tracing for critical payment and inventory events.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "SECURITY";

interface LogPayload {
  event: string;
  orderId?: string;
  paymentId?: string;
  userId?: string;
  details?: any;
  error?: string;
}

export const auditLog = async (level: LogLevel, payload: LogPayload) => {
  const timestamp = new Date().toISOString();
  
  // 1. Console Log (Vercel/Cloud Logs)
  const logMessage = `[${level}] ${timestamp} | ${payload.event} | ${payload.orderId || "N/A"} | ${payload.error || ""}`;
  if (level === "ERROR" || level === "SECURITY") {
    console.error(logMessage, payload.details || "");
  } else {
    console.log(logMessage, payload.details || "");
  }

  // 2. Persistent Audit Log (Firestore)
  // We use a separate 'audit_logs' collection for permanent records
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...payload,
      level,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // If logging to Firestore fails, we still have the console log
    console.warn("Failed to persist audit log to Firestore:", err);
  }
};
