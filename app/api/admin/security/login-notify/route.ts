/**
 * Login Notification API
 * Records logins and sends notifications for new devices/locations
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/rbac';
import { getClientInfo, logSecurityEvent } from '@/lib/logger';
import {
  recordLogin,
  isTrustedDevice,
  parseUserAgent,
  detectSuspiciousLogin,
  markNotificationSent,
  trustDevice,
} from '@/lib/login-history';
import { sendLoginNotification, shouldSendNotification } from '@/lib/email-service';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/security/login-notify
 * Record login and send notification if new device/location
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    // Record the login
    const loginRecord = await recordLogin(
      admin.uid,
      admin.email || '',
      ip,
      userAgent
    );
    
    // Check if device is trusted
    const isTrusted = await isTrustedDevice(admin.uid, loginRecord.deviceFingerprint);
    
    // Check for suspicious activity
    const suspiciousCheck = await detectSuspiciousLogin(
      admin.uid,
      ip,
      loginRecord.deviceFingerprint
    );
    
    // Determine if we should send notification
    const shouldNotify = await shouldSendNotification(admin.uid);
    let notificationSent = false;
    
    // Send notification if:
    // 1. New device and not trusted
    // 2. New location
    // 3. Suspicious activity detected
    if (shouldNotify && (loginRecord.isNewDevice || loginRecord.isNewLocation || suspiciousCheck.isSuspicious) && !isTrusted) {
      const deviceInfo = parseUserAgent(userAgent);
      
      const emailResult = await sendLoginNotification({
        userEmail: admin.email || '',
        userName: admin.profile?.name || admin.email || 'Admin User',
        loginTime: loginRecord.timestamp,
        ip,
        location: loginRecord.location,
        deviceInfo,
        isNewDevice: loginRecord.isNewDevice,
        isNewLocation: loginRecord.isNewLocation,
        isSuspicious: suspiciousCheck.isSuspicious,
        suspiciousReasons: suspiciousCheck.reasons,
      });
      
      if (emailResult.success) {
        notificationSent = true;
        await markNotificationSent(loginRecord.id);
        
        // Log the notification
        await logSecurityEvent({
          type: 'SECURITY',
          action: 'LOGIN_NOTIFICATION_SENT',
          userId: admin.uid,
          role: admin.role,
          ip,
          userAgent,
          status: 'SUCCESS',
          metadata: {
            loginId: loginRecord.id,
            isNewDevice: loginRecord.isNewDevice,
            isNewLocation: loginRecord.isNewLocation,
            isSuspicious: suspiciousCheck.isSuspicious,
          },
          timestamp: new Date(),
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      login: {
        id: loginRecord.id,
        timestamp: loginRecord.timestamp.toISOString(),
        isNewDevice: loginRecord.isNewDevice,
        isNewLocation: loginRecord.isNewLocation,
        isTrustedDevice: isTrusted,
        isSuspicious: suspiciousCheck.isSuspicious,
        suspiciousReasons: suspiciousCheck.reasons,
        location: loginRecord.location,
      },
      notificationSent,
    });
  } catch (error: any) {
    console.error('Failed to process login notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process login notification' },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/admin/security/login-notify/status
 * Check if current session is from a trusted device
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const { createDeviceFingerprint } = await import('@/lib/login-history');
    const fingerprint = createDeviceFingerprint(userAgent, ip);
    const isTrusted = await isTrustedDevice(admin.uid, fingerprint);
    
    return NextResponse.json({
      success: true,
      isTrustedDevice: isTrusted,
    });
  } catch (error: any) {
    console.error('Failed to check device trust status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check device status' },
      { status: error.status || 500 }
    );
  }
}
