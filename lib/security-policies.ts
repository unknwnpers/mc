/**
 * Security Policies Configuration
 * Manage configurable security settings for the application
 */

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logSecurityEvent } from './logger';

export interface SecurityPolicies {
  // Failed login settings
  maxFailedAttempts: number;
  failedAttemptsWindow: number;
  
  // Auto-block settings
  autoBlockEnabled: boolean;
  blockDuration: number;
  
  // Rate limiting settings
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
  
  // Session settings
  sessionTimeout: number;
  maxConcurrentSessions: number;
  
  // Notification settings
  notifyOnBlock: boolean;
  notifyEmail?: string;
  
  // Metadata
  updatedAt?: Date;
  updatedBy?: string;
}

const POLICIES_DOC_ID = 'config';
const POLICIES_COLLECTION = 'security_policies';

// In-memory cache
let policiesCache: SecurityPolicies | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Default security policies
 */
export function getDefaultPolicies(): SecurityPolicies {
  return {
    maxFailedAttempts: 5,
    failedAttemptsWindow: 5,
    autoBlockEnabled: true,
    blockDuration: 60,
    rateLimitEnabled: true,
    rateLimitRequests: 20,
    rateLimitWindow: 60,
    sessionTimeout: 120,
    maxConcurrentSessions: 3,
    notifyOnBlock: true,
  };
}

/**
 * Validation ranges for policy values
 */
export const policyValidationRanges = {
  maxFailedAttempts: { min: 1, max: 20 },
  failedAttemptsWindow: { min: 1, max: 60 },
  blockDuration: { min: 5, max: 1440 },
  rateLimitRequests: { min: 5, max: 100 },
  rateLimitWindow: { min: 10, max: 300 },
  sessionTimeout: { min: 15, max: 480 },
  maxConcurrentSessions: { min: 1, max: 10 },
};

/**
 * Validate policy values
 */
export function validatePolicies(policies: Partial<SecurityPolicies>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (policies.maxFailedAttempts !== undefined) {
    const { min, max } = policyValidationRanges.maxFailedAttempts;
    if (policies.maxFailedAttempts < min || policies.maxFailedAttempts > max) {
      errors.push(`maxFailedAttempts must be between ${min} and ${max}`);
    }
  }
  
  if (policies.failedAttemptsWindow !== undefined) {
    const { min, max } = policyValidationRanges.failedAttemptsWindow;
    if (policies.failedAttemptsWindow < min || policies.failedAttemptsWindow > max) {
      errors.push(`failedAttemptsWindow must be between ${min} and ${max}`);
    }
  }
  
  if (policies.blockDuration !== undefined) {
    const { min, max } = policyValidationRanges.blockDuration;
    if (policies.blockDuration < min || policies.blockDuration > max) {
      errors.push(`blockDuration must be between ${min} and ${max}`);
    }
  }
  
  if (policies.rateLimitRequests !== undefined) {
    const { min, max } = policyValidationRanges.rateLimitRequests;
    if (policies.rateLimitRequests < min || policies.rateLimitRequests > max) {
      errors.push(`rateLimitRequests must be between ${min} and ${max}`);
    }
  }
  
  if (policies.rateLimitWindow !== undefined) {
    const { min, max } = policyValidationRanges.rateLimitWindow;
    if (policies.rateLimitWindow < min || policies.rateLimitWindow > max) {
      errors.push(`rateLimitWindow must be between ${min} and ${max}`);
    }
  }
  
  if (policies.sessionTimeout !== undefined) {
    const { min, max } = policyValidationRanges.sessionTimeout;
    if (policies.sessionTimeout < min || policies.sessionTimeout > max) {
      errors.push(`sessionTimeout must be between ${min} and ${max}`);
    }
  }
  
  if (policies.maxConcurrentSessions !== undefined) {
    const { min, max } = policyValidationRanges.maxConcurrentSessions;
    if (policies.maxConcurrentSessions < min || policies.maxConcurrentSessions > max) {
      errors.push(`maxConcurrentSessions must be between ${min} and ${max}`);
    }
  }
  
  if (policies.notifyEmail !== undefined && policies.notifyEmail !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(policies.notifyEmail)) {
      errors.push('notifyEmail must be a valid email address');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Get current security policies
 * Uses cache if available and not expired
 */
export async function getSecurityPolicies(): Promise<SecurityPolicies> {
  const now = Date.now();
  
  // Return cached policies if valid
  if (policiesCache && (now - cacheTimestamp) < CACHE_TTL) {
    return policiesCache;
  }
  
  try {
    const doc = await adminDb.collection(POLICIES_COLLECTION).doc(POLICIES_DOC_ID).get();
    
    if (doc.exists) {
      const data = doc.data() as any;
      policiesCache = {
        ...getDefaultPolicies(),
        ...data,
        updatedAt: data.updatedAt?.toDate?.(),
      };
    } else {
      // Create default policies if none exist
      policiesCache = getDefaultPolicies();
      await adminDb.collection(POLICIES_COLLECTION).doc(POLICIES_DOC_ID).set({
        ...policiesCache,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: 'system',
      });
    }
    
    cacheTimestamp = now;
    return policiesCache!;
  } catch (error) {
    console.error('Failed to fetch security policies:', error);
    return getDefaultPolicies();
  }
}

/**
 * Update security policies
 */
export async function updateSecurityPolicies(
  policies: Partial<SecurityPolicies>,
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  // Validate policies
  const validation = validatePolicies(policies);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }
  
  try {
    // Get current policies for logging
    const currentPolicies = await getSecurityPolicies();
    
    // Update policies
    const updateData = {
      ...policies,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: userId,
    };
    
    await adminDb.collection(POLICIES_COLLECTION).doc(POLICIES_DOC_ID).set(
      updateData,
      { merge: true }
    );
    
    // Clear cache
    policiesCache = null;
    cacheTimestamp = 0;
    
    // Log the policy change
    const changedFields = Object.keys(policies).filter(
      (key) => key !== 'updatedAt' && key !== 'updatedBy'
    );
    
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'POLICY_UPDATED',
      userId,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        changedFields,
        oldValues: changedFields.reduce((acc, key) => {
          acc[key] = (currentPolicies as any)[key];
          return acc;
        }, {} as any),
        newValues: changedFields.reduce((acc, key) => {
          acc[key] = (policies as any)[key];
          return acc;
        }, {} as any),
      },
      timestamp: new Date(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update security policies:', error);
    return { success: false, error: error.message || 'Failed to update policies' };
  }
}

/**
 * Reset policies to defaults
 */
export async function resetSecurityPolicies(
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const defaults = getDefaultPolicies();
    
    await adminDb.collection(POLICIES_COLLECTION).doc(POLICIES_DOC_ID).set({
      ...defaults,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: userId,
    });
    
    // Clear cache
    policiesCache = null;
    cacheTimestamp = 0;
    
    // Log the reset
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'POLICY_RESET',
      userId,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { defaults },
      timestamp: new Date(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to reset security policies:', error);
    return { success: false, error: error.message || 'Failed to reset policies' };
  }
}

/**
 * Clear the policies cache
 * Call this when you need to force a fresh read
 */
export function clearPoliciesCache(): void {
  policiesCache = null;
  cacheTimestamp = 0;
}
