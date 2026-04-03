import { adminDb } from "./firebase-admin";

export type LogType = "ADMIN_ACTION" | "AUTH" | "SECURITY";
export type LogStatus = "SUCCESS" | "FAILED";

export interface SecurityLog {
  type: LogType;
  action: string;
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  status: LogStatus;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Centralized security logging for all critical actions
 */
export async function logSecurityEvent(data: SecurityLog) {
  try {
    // CRITICAL: Remove undefined fields before writing to Firestore
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );

    await adminDb.collection("security_logs").add({
      ...cleanData,
      timestamp: new Date(),
    });

    // Also log to admin_logs for backward compatibility
    if (data.type === "ADMIN_ACTION") {
      const adminLogData: any = {
        adminId: data.userId,
        action: data.action,
        status: data.status,
        ip: data.ip,
        createdAt: new Date(),
      };
      
      // Only add optional fields if they exist
      if (data.metadata?.resourceId) adminLogData.resourceId = data.metadata.resourceId;
      if (data.metadata) adminLogData.details = JSON.stringify(data.metadata);

      await adminDb.collection("admin_logs").add(adminLogData);
    }

    console.log(`✅ Security log: ${data.type} - ${data.action} - ${data.status}`);
  } catch (error) {
    console.error("❌ Failed to write security log:", error);
    // Don't throw - logging failure shouldn't break main flow
  }
}

/**
 * Legacy audit log function for backward compatibility with Razorpay routes
 */
export type LogLevel = "INFO" | "WARN" | "ERROR" | "SECURITY";

export interface AuditLogPayload {
  event: string;
  orderId?: string;
  paymentId?: string;
  userId?: string;
  details?: any;
  error?: string;
}

export async function auditLog(level: LogLevel, payload: AuditLogPayload) {
  const timestamp = new Date().toISOString();
  
  // Console Log (Vercel/Cloud Logs)
  const logMessage = `[${level}] ${timestamp} | ${payload.event} | ${payload.orderId || "N/A"} | ${payload.error || ""}`;
  if (level === "ERROR" || level === "SECURITY") {
    console.error(logMessage, payload.details || "");
  } else {
    console.log(logMessage, payload.details || "");
  }

  // Persistent Audit Log (Firestore)
  try {
    // CRITICAL: Remove undefined fields before writing to Firestore
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, value]) => value !== undefined)
    );

    await adminDb.collection("audit_logs").add({
      ...cleanPayload,
      level,
      timestamp: new Date(),
    });
  } catch (err) {
    // If logging to Firestore fails, we still have the console log
    console.warn("Failed to persist audit log to Firestore:", err);
  }
}

/**
 * Helper to extract client info from request
 */
export function getClientInfo(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}
