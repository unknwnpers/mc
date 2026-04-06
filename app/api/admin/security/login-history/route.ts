/**
 * Login History API
 * Retrieve login history for admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifySuperAdmin } from '@/lib/rbac';
import { getRecentLogins } from '@/lib/login-history';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/login-history
 * Get login history for current user or all users (superadmin)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    
    // If userId is specified and different from current user, verify superadmin
    if (userId && userId !== admin.uid) {
      await verifySuperAdmin(request);
    }
    
    const targetUserId = userId || admin.uid;
    const logins = await getRecentLogins(targetUserId, Math.min(limit, 100));
    
    return NextResponse.json({
      success: true,
      logins: logins.map((login) => ({
        id: login.id,
        timestamp: login.timestamp.toISOString(),
        ip: login.ip,
        location: login.location,
        isNewDevice: login.isNewDevice,
        isNewLocation: login.isNewLocation,
        notificationSent: login.notificationSent,
      })),
      count: logins.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch login history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch login history' },
      { status: error.status || 500 }
    );
  }
}
