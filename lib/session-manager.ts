/**
 * Session Management for Admin Users
 * Tracks active admin sessions and provides force logout capability
 */

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AdminSession {
  id: string;
  userId: string;
  userEmail: string;
  role: string;
  ip: string;
  userAgent: string;
  loginTime: Date;
  lastActivity: Date;
  isActive: boolean;
  terminatedAt?: Date;
  terminatedBy?: string;
}

export interface SessionCreateData {
  userId: string;
  userEmail: string;
  role: string;
  ip: string;
  userAgent: string;
}

const SESSION_COLLECTION = 'admin_sessions';
const SESSION_STORAGE_KEY = 'admin_session_id';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create a new admin session
 */
export async function createSession(data: SessionCreateData): Promise<string> {
  const sessionId = generateSessionId();
  
  const sessionData = {
    id: sessionId,
    userId: data.userId,
    userEmail: data.userEmail,
    role: data.role,
    ip: data.ip,
    userAgent: data.userAgent,
    loginTime: FieldValue.serverTimestamp(),
    lastActivity: FieldValue.serverTimestamp(),
    isActive: true,
  };
  
  await adminDb.collection(SESSION_COLLECTION).doc(sessionId).set(sessionData);
  
  // Store session ID in localStorage for client-side tracking
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Update session last activity timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await adminDb.collection(SESSION_COLLECTION).doc(sessionId).update({
      lastActivity: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Session might not exist, ignore error
    console.warn('Failed to update session activity:', error);
  }
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<AdminSession | null> {
  const doc = await adminDb.collection(SESSION_COLLECTION).doc(sessionId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data() as any;
  return {
    id: doc.id,
    userId: data.userId,
    userEmail: data.userEmail,
    role: data.role,
    ip: data.ip,
    userAgent: data.userAgent,
    loginTime: data.loginTime?.toDate?.() || new Date(),
    lastActivity: data.lastActivity?.toDate?.() || new Date(),
    isActive: data.isActive,
    terminatedAt: data.terminatedAt?.toDate?.(),
    terminatedBy: data.terminatedBy,
  };
}

/**
 * Get all active sessions
 */
export async function getActiveSessions(): Promise<AdminSession[]> {
  try {
    const snapshot = await adminDb
      .collection(SESSION_COLLECTION)
      .where('isActive', '==', true)
      .orderBy('lastActivity', 'desc')
      .get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        userId: data.userId,
        userEmail: data.userEmail,
        role: data.role,
        ip: data.ip,
        userAgent: data.userAgent,
        loginTime: data.loginTime?.toDate?.() || new Date(),
        lastActivity: data.lastActivity?.toDate?.() || new Date(),
        isActive: data.isActive,
      };
    });
  } catch (error: any) {
    // If index error, return empty array instead of crashing
    if (error.message?.includes('index')) {
      console.warn('Firestore index required for sessions query. Please create the index in Firebase Console.');
      return [];
    }
    throw error;
  }
}

/**
 * Terminate a session (force logout)
 */
export async function terminateSession(
  sessionId: string, 
  terminatedBy: string
): Promise<void> {
  await adminDb.collection(SESSION_COLLECTION).doc(sessionId).update({
    isActive: false,
    terminatedAt: FieldValue.serverTimestamp(),
    terminatedBy,
  });
}

/**
 * End session normally (user logout)
 */
export async function endSession(sessionId: string): Promise<void> {
  await adminDb.collection(SESSION_COLLECTION).doc(sessionId).update({
    isActive: false,
  });
  
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

/**
 * Get current session ID from localStorage
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(SESSION_STORAGE_KEY);
}

/**
 * Check if current session is still active
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  return session?.isActive ?? false;
}

/**
 * Clean up old inactive sessions (run periodically)
 */
export async function cleanupOldSessions(daysToKeep: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const snapshot = await adminDb
    .collection(SESSION_COLLECTION)
    .where('isActive', '==', false)
    .where('loginTime', '<', cutoffDate)
    .get();
  
  const batch = adminDb.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  return snapshot.size;
}
