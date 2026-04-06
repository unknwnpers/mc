/**
 * Password Reset API
 * Superadmin can reset admin passwords
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { verifySuperAdmin } from '@/lib/rbac';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateTemporaryPassword } from '@/lib/password-policy';
import { addPasswordToHistory } from '@/lib/password-history';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security/reset-password
 * Reset an admin's password (superadmin only)
 */
export async function POST(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { userId, notifyUser = true } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Prevent superadmin from resetting their own password via this endpoint
    if (userId === superAdmin.uid) {
      return NextResponse.json(
        { success: false, error: 'Cannot reset your own password via this endpoint' },
        { status: 403 }
      );
    }
    
    // Get target user details
    const targetUserDoc = await adminDb.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const targetUserData = targetUserDoc.data();
    const targetUserEmail = targetUserData?.email;
    
    // Verify target is an admin
    if (targetUserData?.role !== 'admin' && targetUserData?.role !== 'superadmin') {
      return NextResponse.json(
        { success: false, error: 'Can only reset passwords for admin users' },
        { status: 403 }
      );
    }
    
    // Generate temporary password
    const tempPassword = generateTemporaryPassword(16);
    
    // Update password in Firebase Auth
    try {
      await getAuth().updateUser(userId, {
        password: tempPassword,
      });
    } catch (error: any) {
      console.error('Failed to reset password in Firebase Auth:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to reset password. Please try again.' },
        { status: 500 }
      );
    }
    
    // Add to password history
    await addPasswordToHistory(userId, tempPassword, 'RESET');
    
    // Update user document
    await adminDb.collection('users').doc(userId).update({
      passwordLastChanged: FieldValue.serverTimestamp(),
      passwordChangeRequired: true,
      passwordResetBy: superAdmin.uid,
      passwordResetAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // Log the password reset
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'PASSWORD_RESET',
      userId: superAdmin.uid,
      role: 'superadmin',
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        targetUserId: userId,
        targetUserEmail,
        targetUserRole: targetUserData?.role,
        notifyUser,
      },
      timestamp: new Date(),
    });
    
    // TODO: Send email notification to user if notifyUser is true
    // This would integrate with SendGrid or similar service
    if (notifyUser && targetUserEmail) {
      console.log(`[Password Reset] Would send email to ${targetUserEmail} with temporary password`);
      // await sendPasswordResetEmail(targetUserEmail, tempPassword);
    }
    
    return NextResponse.json({
      success: true,
      message: `Password reset successfully for ${targetUserEmail || userId}`,
      temporaryPassword: tempPassword, // Only returned for superadmin to communicate to user
      notifyUser,
    });
  } catch (error: any) {
    console.error('Failed to reset password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset password' },
      { status: error.status || 500 }
    );
  }
}
