/**
 * Alert Configuration API
 * Manage alert settings and channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import {
  getAlertConfig,
  updateAlertConfig,
  testChannel,
  type AlertChannel,
} from '@/lib/alert-service';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/alerts/config
 * Get current alert configuration
 */
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    
    const config = await getAlertConfig();
    
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('Failed to fetch alert config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch alert config' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/security/alerts/config
 * Update alert configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { config } = body;
    
    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Config object is required' },
        { status: 400 }
      );
    }
    
    // Validate severity
    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (config.minSeverity && !validSeverities.includes(config.minSeverity)) {
      return NextResponse.json(
        { success: false, error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate channels
    if (config.channels) {
      const validChannelTypes = ['EMAIL', 'WEBHOOK', 'DASHBOARD', 'SLACK'];
      for (const channel of config.channels) {
        if (!validChannelTypes.includes(channel.type)) {
          return NextResponse.json(
            { success: false, error: `Invalid channel type: ${channel.type}` },
            { status: 400 }
          );
        }
      }
    }
    
    const success = await updateAlertConfig(config, superAdmin.uid);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update alert config' },
        { status: 500 }
      );
    }
    
    // Log the action
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'ALERT_CONFIG_UPDATED',
      userId: superAdmin.uid,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        minSeverity: config.minSeverity,
        channels: config.channels?.map((c: AlertChannel) => c.type),
      },
      timestamp: new Date(),
    });
    
    // Fetch updated config
    const updatedConfig = await getAlertConfig();
    
    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error('Failed to update alert config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update alert config' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/security/alerts/config/test
 * Test an alert channel
 */
export async function POST(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    
    const body = await request.json();
    const { channel, action } = body;
    
    if (action === 'test' && channel) {
      const result = await testChannel(channel);
      
      return NextResponse.json({
        success: result.success,
        result,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action or missing channel' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to test alert channel:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to test alert channel' },
      { status: error.status || 500 }
    );
  }
}
