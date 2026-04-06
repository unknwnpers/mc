/**
 * Security Policies API
 * Manage configurable security settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import {
  getSecurityPolicies,
  updateSecurityPolicies,
  resetSecurityPolicies,
  validatePolicies,
  SecurityPolicies,
} from '@/lib/security-policies';
import { getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/policies
 * Fetch current security policies
 */
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    
    const policies = await getSecurityPolicies();
    
    return NextResponse.json({
      success: true,
      policies,
    });
  } catch (error: any) {
    console.error('Failed to fetch security policies:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch policies',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/security/policies
 * Update security policies
 */
export async function PUT(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { policies } = body;
    
    if (!policies || typeof policies !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Policies object required' },
        { status: 400 }
      );
    }
    
    // Validate policies
    const validation = validatePolicies(policies);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Update policies
    const result = await updateSecurityPolicies(
      policies as Partial<SecurityPolicies>,
      superAdmin.uid,
      ip,
      userAgent
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    // Fetch updated policies
    const updatedPolicies = await getSecurityPolicies();
    
    return NextResponse.json({
      success: true,
      policies: updatedPolicies,
    });
  } catch (error: any) {
    console.error('Failed to update security policies:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update policies',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/security/policies
 * Reset policies to defaults
 */
export async function POST(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { action } = body;
    
    if (action !== 'reset') {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "reset" to reset policies.' },
        { status: 400 }
      );
    }
    
    // Reset policies
    const result = await resetSecurityPolicies(superAdmin.uid, ip, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
    
    // Fetch reset policies
    const policies = await getSecurityPolicies();
    
    return NextResponse.json({
      success: true,
      policies,
    });
  } catch (error: any) {
    console.error('Failed to reset security policies:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reset policies',
      },
      { status: error.status || 500 }
    );
  }
}
