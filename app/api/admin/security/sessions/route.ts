/**
 * Admin Sessions Management API
 * List and manage active admin sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import { getActiveSessions, terminateSession } from '@/lib/session-manager';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/sessions
 * List all active admin sessions
 */
export async function GET(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    
    const sessions = await getActiveSessions();
    
    // Serialize timestamps for JSON response
    const serializedSessions = sessions.map((session) => ({
      ...session,
      loginTime: session.loginTime.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
    }));
    
    return NextResponse.json({
      success: true,
      sessions: serializedSessions,
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch sessions',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/security/sessions
 * Terminate a specific session (force logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { sessionId } = body;
    
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }
    
    // Prevent superadmin from terminating their own session
    const sessions = await getActiveSessions();
    const targetSession = sessions.find((s) => s.id === sessionId);
    
    if (!targetSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found or already inactive' },
        { status: 404 }
      );
    }
    
    if (targetSession.userId === superAdmin.uid) {
      return NextResponse.json(
        { success: false, error: 'Cannot terminate your own session' },
        { status: 403 }
      );
    }
    
    // Terminate the session
    await terminateSession(sessionId, superAdmin.uid);
    
    // Log the security event
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'SESSION_TERMINATED',
      userId: superAdmin.uid,
      role: 'superadmin',
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        terminatedSessionId: sessionId,
        terminatedUserId: targetSession.userId,
        terminatedUserEmail: targetSession.userEmail,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Session for ${targetSession.userEmail} terminated successfully`,
    });
  } catch (error: any) {
    console.error('Failed to terminate session:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to terminate session',
      },
      { status: error.status || 500 }
    );
  }
}
