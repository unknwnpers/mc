/**
 * Admin Session Creation API
 * Called when an admin user logs in
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/rbac';
import { createSession } from '@/lib/session-manager';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security/sessions/create
 * Create a new admin session on login
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { userId, userEmail, role } = body;
    
    // Validate request matches authenticated user
    if (userId !== admin.uid) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      );
    }
    
    // Create the session
    const sessionId = await createSession({
      userId,
      userEmail: userEmail || admin.email || '',
      role: role || admin.role || 'admin',
      ip,
      userAgent,
    });
    
    // Log the login event
    await logSecurityEvent({
      type: 'AUTH',
      action: 'ADMIN_LOGIN',
      userId: admin.uid,
      role: role || admin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { sessionId },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error: any) {
    console.error('Failed to create admin session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create session',
      },
      { status: error.status || 500 }
    );
  }
}
