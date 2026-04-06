/**
 * Threats API
 * Manage detected security threats
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import {
  getThreats,
  getThreat,
  updateThreatStatus,
  deleteThreat,
  getRelatedThreats,
  type ThreatFilters,
} from '@/lib/threat-storage';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/threats
 * List threats with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: ThreatFilters = {};
    
    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as any;
    }
    
    const severity = searchParams.get('severity');
    if (severity) {
      filters.severity = severity.split(',') as any;
    }
    
    const sourceType = searchParams.get('sourceType') as any;
    if (sourceType) {
      filters.sourceType = sourceType;
    }
    
    const sourceValue = searchParams.get('sourceValue');
    if (sourceValue) {
      filters.sourceValue = sourceValue;
    }
    
    const ruleId = searchParams.get('ruleId');
    if (ruleId) {
      filters.ruleId = ruleId;
    }
    
    const startDate = searchParams.get('startDate');
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    
    const endDate = searchParams.get('endDate');
    if (endDate) {
      filters.endDate = new Date(endDate);
    }
    
    // Parse pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await getThreats(filters, { limit, offset });
    
    return NextResponse.json({
      success: true,
      threats: result.threats,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch threats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch threats' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/security/threats
 * Update threat status (acknowledge, resolve, false positive)
 */
export async function PUT(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { threatId, action, resolution, notes } = body;
    
    if (!threatId || !action) {
      return NextResponse.json(
        { success: false, error: 'threatId and action are required' },
        { status: 400 }
      );
    }
    
    // Validate action
    const validActions = ['acknowledge', 'resolve', 'false-positive'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get threat for logging
    const threat = await getThreat(threatId);
    if (!threat) {
      return NextResponse.json(
        { success: false, error: 'Threat not found' },
        { status: 404 }
      );
    }
    
    // Map action to status
    const statusMap: Record<string, any> = {
      'acknowledge': 'ACKNOWLEDGED',
      'resolve': 'RESOLVED',
      'false-positive': 'FALSE_POSITIVE',
    };
    
    const success = await updateThreatStatus(
      threatId,
      statusMap[action],
      superAdmin.uid,
      { resolution, notes }
    );
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update threat status' },
        { status: 500 }
      );
    }
    
    // Log the action
    await logSecurityEvent({
      type: 'SECURITY',
      action: `THREAT_${action.toUpperCase().replace('-', '_')}`,
      userId: superAdmin.uid,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        threatId,
        threatRule: threat.ruleName,
        threatSeverity: threat.severity,
        resolution,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Threat ${action}d successfully`,
    });
  } catch (error: any) {
    console.error('Failed to update threat:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update threat' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/security/threats
 * Delete a threat (superadmin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const { searchParams } = new URL(request.url);
    const threatId = searchParams.get('id');
    
    if (!threatId) {
      return NextResponse.json(
        { success: false, error: 'threatId is required' },
        { status: 400 }
      );
    }
    
    // Get threat for logging
    const threat = await getThreat(threatId);
    if (!threat) {
      return NextResponse.json(
        { success: false, error: 'Threat not found' },
        { status: 404 }
      );
    }
    
    const success = await deleteThreat(threatId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete threat' },
        { status: 500 }
      );
    }
    
    // Log the action
    await logSecurityEvent({
      type: 'SECURITY',
      action: 'THREAT_DELETED',
      userId: superAdmin.uid,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: {
        threatId,
        threatRule: threat.ruleName,
        threatSeverity: threat.severity,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: 'Threat deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete threat:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete threat' },
      { status: error.status || 500 }
    );
  }
}
