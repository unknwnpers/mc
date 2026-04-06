/**
 * Trusted Devices Management API
 * Manage user's trusted devices for login notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/rbac';
import { getClientInfo, logSecurityEvent } from '@/lib/logger';
import {
  getTrustedDevices,
  trustDevice,
  untrustDevice,
  untrustAllDevices,
  parseUserAgent,
  createDeviceFingerprint,
} from '@/lib/login-history';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/trusted-devices
 * List user's trusted devices
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    
    const devices = await getTrustedDevices(admin.uid);
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch trusted devices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch trusted devices' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/security/trusted-devices
 * Trust the current device
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const fingerprint = createDeviceFingerprint(userAgent, ip);
    const deviceInfo = parseUserAgent(userAgent);
    
    // Get location info if available
    const { getLocationFromIP } = await import('@/lib/login-history');
    const location = await getLocationFromIP(ip);
    const locationStr = location
      ? [location.city, location.region, location.country].filter(Boolean).join(', ')
      : undefined;
    
    await trustDevice(admin.uid, fingerprint, deviceInfo, locationStr);
    
    // Log the action
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'DEVICE_TRUSTED',
      userId: admin.uid,
      role: admin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        device: `${deviceInfo.device} - ${deviceInfo.browser}`,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: 'Device trusted successfully',
      device: {
        fingerprint,
        name: `${deviceInfo.device} - ${deviceInfo.browser}`,
        os: `${deviceInfo.os} ${deviceInfo.osVersion}`,
      },
    });
  } catch (error: any) {
    console.error('Failed to trust device:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to trust device' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/security/trusted-devices
 * Untrust a specific device
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('id');
    const untrustAll = searchParams.get('all') === 'true';
    
    if (untrustAll) {
      // Untrust all devices
      const count = await untrustAllDevices(admin.uid);
      
      await logSecurityEvent({
        type: 'SECURITY',
        action: 'ALL_DEVICES_UNTRUSTED',
        userId: admin.uid,
        role: admin.role,
        ip,
        userAgent,
        status: 'SUCCESS',
        metadata: { count },
        timestamp: new Date(),
      });
      
      return NextResponse.json({
        success: true,
        message: `Removed ${count} trusted devices`,
        count,
      });
    }
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      );
    }
    
    await untrustDevice(admin.uid, deviceId);
    
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'DEVICE_UNTRUSTED',
      userId: admin.uid,
      role: admin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { deviceId },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: 'Device removed from trusted list',
    });
  } catch (error: any) {
    console.error('Failed to untrust device:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to untrust device' },
      { status: error.status || 500 }
    );
  }
}
