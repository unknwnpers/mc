/**
 * Password Policy API
 * Manage and validate password policies
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import {
  getPasswordPolicy,
  updatePasswordPolicy,
  validatePassword,
  getPasswordRequirements,
  type PasswordPolicy,
} from '@/lib/password-policy';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/password-policy
 * Get current password policy
 */
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    
    const policy = await getPasswordPolicy();
    const requirements = getPasswordRequirements(policy);
    
    return NextResponse.json({
      success: true,
      policy,
      requirements,
    });
  } catch (error: any) {
    console.error('Failed to fetch password policy:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch password policy' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/security/password-policy
 * Update password policy
 */
export async function PUT(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { policy } = body;
    
    if (!policy || typeof policy !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Policy object is required' },
        { status: 400 }
      );
    }
    
    const result = await updatePasswordPolicy(policy as Partial<PasswordPolicy>, superAdmin.uid);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    // Log the policy change
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'PASSWORD_POLICY_UPDATED',
      userId: superAdmin.uid,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        changes: Object.keys(policy),
      },
      timestamp: new Date(),
    });
    
    // Fetch updated policy
    const updatedPolicy = await getPasswordPolicy();
    
    return NextResponse.json({
      success: true,
      policy: updatedPolicy,
    });
  } catch (error: any) {
    console.error('Failed to update password policy:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update password policy' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/security/password-policy
 * Validate a password against current policy
 */
export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    
    const body = await request.json();
    const { password, action } = body;
    
    if (action === 'validate') {
      if (!password || typeof password !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Password is required' },
          { status: 400 }
        );
      }
      
      const policy = await getPasswordPolicy();
      const result = validatePassword(password, policy);
      
      return NextResponse.json({
        success: true,
        result,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to validate password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate password' },
      { status: error.status || 500 }
    );
  }
}
