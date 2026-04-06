/**
 * Password Policy Configuration and Validation
 * Enforces strong password requirements for admin users
 */

import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  maxAgeDays: number;
  preventReuseCount: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: number; // 0-100
  strengthLabel: 'Weak' | 'Fair' | 'Good' | 'Strong';
}

const POLICY_DOC_ID = 'config';
const POLICY_COLLECTION = 'password_policy';

// Default password policy
export function getDefaultPasswordPolicy(): PasswordPolicy {
  return {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    maxAgeDays: 90,
    preventReuseCount: 5,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
  };
}

/**
 * Get current password policy from Firestore
 */
export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  try {
    const doc = await adminDb.collection(POLICY_COLLECTION).doc(POLICY_DOC_ID).get();
    
    if (doc.exists) {
      const data = doc.data() as any;
      return {
        ...getDefaultPasswordPolicy(),
        ...data,
        updatedAt: data.updatedAt?.toDate?.(),
      };
    }
    
    // Create default policy if none exists
    const defaultPolicy = getDefaultPasswordPolicy();
    await adminDb.collection(POLICY_COLLECTION).doc(POLICY_DOC_ID).set({
      ...defaultPolicy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return defaultPolicy;
  } catch (error) {
    console.error('Failed to fetch password policy:', error);
    return getDefaultPasswordPolicy();
  }
}

/**
 * Update password policy (superadmin only)
 */
export async function updatePasswordPolicy(
  policy: Partial<PasswordPolicy>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate policy values
    if (policy.minLength !== undefined && policy.minLength < 8) {
      return { success: false, error: 'Minimum length must be at least 8' };
    }
    if (policy.maxLength !== undefined && policy.maxLength > 256) {
      return { success: false, error: 'Maximum length cannot exceed 256' };
    }
    if (policy.minLength !== undefined && policy.maxLength !== undefined && policy.minLength > policy.maxLength) {
      return { success: false, error: 'Minimum length cannot exceed maximum length' };
    }
    if (policy.maxAgeDays !== undefined && policy.maxAgeDays < 0) {
      return { success: false, error: 'Max age days cannot be negative' };
    }
    if (policy.preventReuseCount !== undefined && policy.preventReuseCount < 0) {
      return { success: false, error: 'Prevent reuse count cannot be negative' };
    }

    await adminDb.collection(POLICY_COLLECTION).doc(POLICY_DOC_ID).update({
      ...policy,
      updatedBy: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update password policy:', error);
    return { success: false, error: error.message || 'Failed to update policy' };
  }
}

/**
 * Validate password against policy
 */
export function validatePassword(
  password: string,
  policy?: PasswordPolicy
): PasswordValidationResult {
  const errors: string[] = [];
  const effectivePolicy = policy || getDefaultPasswordPolicy();
  
  // Check minimum length
  if (password.length < effectivePolicy.minLength) {
    errors.push(`Password must be at least ${effectivePolicy.minLength} characters long`);
  }
  
  // Check maximum length
  if (password.length > effectivePolicy.maxLength) {
    errors.push(`Password cannot exceed ${effectivePolicy.maxLength} characters`);
  }
  
  // Check uppercase
  if (effectivePolicy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check lowercase
  if (effectivePolicy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check numbers
  if (effectivePolicy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check special characters
  if (effectivePolicy.requireSpecialChars) {
    const specialCharRegex = new RegExp(`[${effectivePolicy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (!specialCharRegex.test(password)) {
      errors.push(`Password must contain at least one special character (${effectivePolicy.specialChars})`);
    }
  }
  
  // Calculate strength
  const strength = calculatePasswordStrength(password, effectivePolicy);
  const strengthLabel = getStrengthLabel(strength);
  
  return {
    valid: errors.length === 0,
    errors,
    strength,
    strengthLabel,
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password: string, policy: PasswordPolicy): number {
  let score = 0;
  
  // Length contribution (up to 40 points)
  const lengthScore = Math.min(password.length / policy.minLength * 40, 40);
  score += lengthScore;
  
  // Character variety contribution (up to 60 points)
  let varietyScore = 0;
  
  if (/[a-z]/.test(password)) varietyScore += 10;
  if (/[A-Z]/.test(password)) varietyScore += 10;
  if (/[0-9]/.test(password)) varietyScore += 10;
  
  const specialCharRegex = new RegExp(`[${policy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
  if (specialCharRegex.test(password)) varietyScore += 15;
  
  // Bonus for extra length
  if (password.length >= 16) varietyScore += 10;
  if (password.length >= 20) varietyScore += 5;
  
  score += varietyScore;
  
  // Penalty for common patterns
  if (/(.+)\1{2,}/.test(password)) score -= 10; // Repeated characters
  if (/^(password|admin|123|qwerty)/i.test(password)) score -= 20; // Common passwords
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Letters only
  if (/^[0-9]+$/.test(password)) score -= 10; // Numbers only
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get strength label from score
 */
function getStrengthLabel(strength: number): 'Weak' | 'Fair' | 'Good' | 'Strong' {
  if (strength < 40) return 'Weak';
  if (strength < 60) return 'Fair';
  if (strength < 80) return 'Good';
  return 'Strong';
}

/**
 * Check if password has expired
 */
export function isPasswordExpired(
  lastChanged: Date | Timestamp | null | undefined,
  maxAgeDays: number
): boolean {
  if (!lastChanged || maxAgeDays <= 0) {
    return false;
  }
  
  let lastChangedDate: Date;
  if (lastChanged instanceof Date) {
    lastChangedDate = lastChanged;
  } else if ((lastChanged as Timestamp).toDate) {
    lastChangedDate = (lastChanged as Timestamp).toDate();
  } else {
    lastChangedDate = new Date(lastChanged as any);
  }
  
  const expirationDate = new Date(lastChangedDate);
  expirationDate.setDate(expirationDate.getDate() + maxAgeDays);
  
  return new Date() > expirationDate;
}

/**
 * Get password expiration date
 */
export function getPasswordExpirationDate(
  lastChanged: Date | Timestamp | null | undefined,
  maxAgeDays: number
): Date | null {
  if (!lastChanged || maxAgeDays <= 0) {
    return null;
  }
  
  let lastChangedDate: Date;
  if (lastChanged instanceof Date) {
    lastChangedDate = lastChanged;
  } else if ((lastChanged as Timestamp).toDate) {
    lastChangedDate = (lastChanged as Timestamp).toDate();
  } else {
    lastChangedDate = new Date(lastChanged as any);
  }
  
  const expirationDate = new Date(lastChangedDate);
  expirationDate.setDate(expirationDate.getDate() + maxAgeDays);
  
  return expirationDate;
}

/**
 * Get days until password expiration
 */
export function getDaysUntilExpiration(
  lastChanged: Date | Timestamp | null | undefined,
  maxAgeDays: number
): number | null {
  const expirationDate = getPasswordExpirationDate(lastChanged, maxAgeDays);
  if (!expirationDate) return null;
  
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Generate a secure temporary password
 */
export function generateTemporaryPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Get password requirements as display text
 */
export function getPasswordRequirements(policy?: PasswordPolicy): string[] {
  const effectivePolicy = policy || getDefaultPasswordPolicy();
  const requirements: string[] = [];
  
  requirements.push(`At least ${effectivePolicy.minLength} characters`);
  
  if (effectivePolicy.requireUppercase) {
    requirements.push('At least one uppercase letter (A-Z)');
  }
  if (effectivePolicy.requireLowercase) {
    requirements.push('At least one lowercase letter (a-z)');
  }
  if (effectivePolicy.requireNumbers) {
    requirements.push('At least one number (0-9)');
  }
  if (effectivePolicy.requireSpecialChars) {
    requirements.push('At least one special character');
  }
  
  return requirements;
}
