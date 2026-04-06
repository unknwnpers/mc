/**
 * Threat Stats API
 * Get threat statistics and trends
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/rbac';
import { getThreatStats } from '@/lib/threat-storage';
import { getThreatRules } from '@/lib/threat-detector';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security/threats/stats
 * Get threat statistics
 */
export async function GET(request: NextRequest) {
  try {
    await verifySuperAdmin(request);
    const { searchParams } = new URL(request.url);
    
    // Parse days parameter (default to 30)
    const days = parseInt(searchParams.get('days') || '30');
    
    // Get threat statistics
    const stats = await getThreatStats(days);
    
    // Get active rules for reference
    const rules = await getThreatRules();
    const enabledRules = rules.filter(r => r.enabled);
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        activeRules: enabledRules.length,
        totalRules: rules.length,
      },
      rules: enabledRules.map(r => ({
        id: r.id,
        name: r.name,
        severity: r.severity,
        enabled: r.enabled,
      })),
    });
  } catch (error: any) {
    console.error('Failed to fetch threat stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch threat stats' },
      { status: error.status || 500 }
    );
  }
}
