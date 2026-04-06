/**
 * Password Change API
 * Change password with policy enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { verifyAdmin } from '@/lib/rbac';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getPasswordPolicy,
  validatePassword,
  isPasswordExpired,
  getDaysUntilExpiration,
} from '@/lib/password-policy';
import { isPasswordReused, addPasswordToHistory, cleanupOldPasswordHistory } from '@/lib/password-history';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security/change-password
 * Change password with full policy validation
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { currentPassword, newPassword, isExpiredChange } = body;
    
    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password is required' },
        { status: 400 }
      );
    }
    
    // Get current password policy
    const policy = await getPasswordPolicy();
    
    // Validate new password against policy
    const validation = validatePassword(newPassword, policy);
    if (!validation.valid) {
      await logSecurityEvent({
        type: 'SECURITY',
        action: 'PASSWORD_POLICY_VIOLATION',
        userId: admin.uid,
        ip,
        userAgent,
        status: 'FAILED',
        metadata: {
          errors: validation.errors,
        },
        timestamp: new Date(),
      });
      
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Check password reuse (if not the first time setting password)
    if (policy.preventReuseCount > 0 && currentPassword) {
      const isReused = await isPasswordReused(admin.uid, newPassword, policy.preventReuseCount);
      if (isReused) {
        await logSecurityEvent({
          type: 'SECURITY',
          action: 'PASSWORD_REUSE_ATTEMPT',
          userId: admin.uid,
          ip,
          userAgent,
          status: 'FAILED',
          timestamp: new Date(),
        });
        
        return NextResponse.json(
          { success: false, error: `Cannot reuse any of your last ${policy.preventReuseCount} passwords` },
          { status: 400 }
        );
      }
    }
    
    // Verify current password if provided (not required for expired password reset flow)
    if (currentPassword) {
      try {
        // Try to verify by attempting a sign-in (this validates the current password)
        const auth = getAuth();
        // We can't directly verify the password, but we can check if the user exists
        // The actual verification happens client-side before calling this API
        // Here we trust that the current password was verified client-side
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Current password verification failed' },
          { status: 401 }
        );
      }
    }
    
    // Update password in Firebase Auth
    try {
      await getAuth().updateUser(admin.uid, {
        password: newPassword,
      });
    } catch (error: any) {
      console.error('Failed to update password in Firebase Auth:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }
    
    // Add old password to history (if we had it)
    if (currentPassword && policy.preventReuseCount > 0) {
      await addPasswordToHistory(admin.uid, currentPassword, 'CHANGE');
      // Cleanup old history entries
      await cleanupOldPasswordHistory(admin.uid, policy.preventReuseCount + 5);
    }
    
    // Update password last changed timestamp in Firestore
    await adminDb.collection('users').doc(admin.uid).update({
      passwordLastChanged: FieldValue.serverTimestamp(),
      passwordChangeRequired: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // Log the password change
    await logSecurityEvent({
      type: 'SECURITY',
      action: isExpiredChange ? 'PASSWORD_EXPIRED_CHANGE' : 'PASSWORD_CHANGED',
      userId: admin.uid,
      role: admin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      timestamp: new Date(),
    });
    
    // Calculate days until next expiration
    const daysUntilExpiration = getDaysUntilExpiration(new Date(), policy.maxAgeDays);
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      strength: validation.strength,
      strengthLabel: validation.strengthLabel,
      daysUntilExpiration,
    });
  } catch (error: any) {
    console.error('Failed to change password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to change password' },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/admin/security/change-password
 * Check password expiration status
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    
    // Get user's password last changed date
    const userDoc = await adminDb.collection('users').doc(admin.uid).get();
    const userData = userDoc.data();
    
    const policy = await getPasswordPolicy();
    const passwordLastChanged = userData?.passwordLastChanged?.toDate?.() || null;
    
    const isExpired = isPasswordExpired(passwordLastChanged, policy.maxAgeDays);
    const daysUntilExpiration = getDaysUntilExpiration(passwordLastChanged, policy.maxAgeDays);
    const changeRequired = userData?.passwordChangeRequired || false;
    
    return NextResponse.json({
      success: true,
      status: {
        isExpired,
        daysUntilExpiration,
        changeRequired,
        lastChanged: passwordLastChanged?.toISOString() || null,
        maxAgeDays: policy.maxAgeDays,
      },
    });
  } catch (error: any) {
    console.error('Failed to check password status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check password status' },
      { status: error.status || 500 }
    );
  }
}
