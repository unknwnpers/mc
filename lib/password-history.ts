/**
 * Password History Management
 * Tracks password history to prevent reuse
 */

import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';

export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
  reason: 'CREATE' | 'RESET' | 'CHANGE';
}

const HISTORY_COLLECTION = 'password_history';

/**
 * Add a password to the user's history
 */
export async function addPasswordToHistory(
  userId: string,
  password: string,
  reason: 'CREATE' | 'RESET' | 'CHANGE' = 'CHANGE'
): Promise<void> {
  try {
    // Hash the password for storage (we only store hashes, never plaintext)
    const passwordHash = await bcrypt.hash(password, 10);
    
    await adminDb.collection(HISTORY_COLLECTION).add({
      userId,
      passwordHash,
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
    
    console.log(`[Password History] Added entry for user ${userId}, reason: ${reason}`);
  } catch (error) {
    console.error('Failed to add password to history:', error);
    // Don't throw - history tracking failure shouldn't block password change
  }
}

/**
 * Check if a password has been used before
 */
export async function isPasswordReused(
  userId: string,
  password: string,
  checkCount: number = 5
): Promise<boolean> {
  try {
    // Get recent password history for this user
    const snapshot = await adminDb
      .collection(HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(checkCount)
      .get();
    
    // Check each historical password
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const isMatch = await bcrypt.compare(password, data.passwordHash);
      if (isMatch) {
        console.log(`[Password History] Reused password detected for user ${userId}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check password history:', error);
    // If we can't check history, allow the change (fail open for UX)
    return false;
  }
}

/**
 * Get password history for a user
 */
export async function getPasswordHistory(
  userId: string,
  limit: number = 10
): Promise<PasswordHistoryEntry[]> {
  try {
    const snapshot = await adminDb
      .collection(HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        passwordHash: data.passwordHash,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        reason: data.reason,
      };
    });
  } catch (error) {
    console.error('Failed to get password history:', error);
    return [];
  }
}

/**
 * Clean up old password history entries
 * Keeps only the most recent `keepCount` entries
 */
export async function cleanupOldPasswordHistory(
  userId: string,
  keepCount: number = 10
): Promise<number> {
  try {
    // Get all entries for this user
    const snapshot = await adminDb
      .collection(HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    // If we have more than keepCount, delete the old ones
    if (snapshot.docs.length > keepCount) {
      const batch = adminDb.batch();
      let deletedCount = 0;
      
      // Delete entries beyond keepCount
      for (let i = keepCount; i < snapshot.docs.length; i++) {
        batch.delete(snapshot.docs[i].ref);
        deletedCount++;
        
        // Firestore batch limit is 500
        if (deletedCount % 500 === 0) {
          await batch.commit();
        }
      }
      
      await batch.commit();
      console.log(`[Password History] Cleaned up ${deletedCount} old entries for user ${userId}`);
      return deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error('Failed to cleanup password history:', error);
    return 0;
  }
}

/**
 * Clear all password history for a user
 * Useful when deleting a user account
 */
export async function clearPasswordHistory(userId: string): Promise<void> {
  try {
    const snapshot = await adminDb
      .collection(HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .get();
    
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`[Password History] Cleared all history for user ${userId}`);
  } catch (error) {
    console.error('Failed to clear password history:', error);
  }
}

/**
 * Initialize password history for a new user
 * This should be called when a user is first created
 */
export async function initializePasswordHistory(
  userId: string,
  initialPassword: string
): Promise<void> {
  await addPasswordToHistory(userId, initialPassword, 'CREATE');
}
