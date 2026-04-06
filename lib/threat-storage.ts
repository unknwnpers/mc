/**
 * Threat Storage & Management
 * Handles persistence and querying of security threats
 */

import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { DetectedThreat, ThreatSeverity, ThreatStatus } from './threat-detector';

export interface StoredThreat extends DetectedThreat {
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  notificationsSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ThreatFilters {
  status?: ThreatStatus | ThreatStatus[];
  severity?: ThreatSeverity | ThreatSeverity[];
  sourceType?: 'IP' | 'USER' | 'SESSION';
  sourceValue?: string;
  ruleId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ThreatStats {
  total: number;
  bySeverity: Record<ThreatSeverity, number>;
  byStatus: Record<ThreatStatus, number>;
  byRule: Record<string, number>;
  activeCount: number;
  criticalCount: number;
  todayCount: number;
  trends: {
    date: string;
    count: number;
  }[];
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedThreats {
  threats: StoredThreat[];
  total: number;
  hasMore: boolean;
}

const THREATS_COLLECTION = 'security_threats';

/**
 * Create a new threat in Firestore
 */
export async function createThreat(
  threat: DetectedThreat,
  notificationsSent: string[] = []
): Promise<string> {
  try {
    const docRef = adminDb.collection(THREATS_COLLECTION).doc(threat.id);
    
    const data = {
      ...threat,
      notificationsSent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    await docRef.set(data);
    return threat.id;
  } catch (error) {
    console.error('Failed to create threat:', error);
    throw error;
  }
}

/**
 * Get a single threat by ID
 */
export async function getThreat(threatId: string): Promise<StoredThreat | null> {
  try {
    const doc = await adminDb.collection(THREATS_COLLECTION).doc(threatId).get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data()!;
    return {
      id: doc.id,
      ...data,
      detectedAt: data.detectedAt?.toDate?.() || data.detectedAt,
      acknowledgedAt: data.acknowledgedAt?.toDate?.(),
      resolvedAt: data.resolvedAt?.toDate?.(),
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    } as StoredThreat;
  } catch (error) {
    console.error('Failed to get threat:', error);
    return null;
  }
}

/**
 * Query threats with filters and pagination
 */
export async function getThreats(
  filters: ThreatFilters = {},
  pagination: PaginationOptions = { limit: 50, offset: 0 }
): Promise<PaginatedThreats> {
  try {
    let query: any = adminDb.collection(THREATS_COLLECTION);
    
    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.where('status', 'in', filters.status);
      } else {
        query = query.where('status', '==', filters.status);
      }
    }
    
    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        query = query.where('severity', 'in', filters.severity);
      } else {
        query = query.where('severity', '==', filters.severity);
      }
    }
    
    if (filters.sourceType) {
      query = query.where('source.type', '==', filters.sourceType);
    }
    
    if (filters.sourceValue) {
      query = query.where('source.value', '==', filters.sourceValue);
    }
    
    if (filters.ruleId) {
      query = query.where('ruleId', '==', filters.ruleId);
    }
    
    if (filters.startDate) {
      query = query.where('detectedAt', '>=', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.where('detectedAt', '<=', filters.endDate);
    }
    
    // Order by detection time (newest first)
    query = query.orderBy('detectedAt', 'desc');
    
    // Get total count (for pagination)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;
    
    // Apply pagination
    query = query.limit(pagination.limit).offset(pagination.offset);
    
    const snapshot = await query.get();
    
    const threats = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        detectedAt: data.detectedAt?.toDate?.() || data.detectedAt,
        acknowledgedAt: data.acknowledgedAt?.toDate?.(),
        resolvedAt: data.resolvedAt?.toDate?.(),
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as StoredThreat;
    });
    
    return {
      threats,
      total,
      hasMore: pagination.offset + threats.length < total,
    };
  } catch (error) {
    console.error('Failed to fetch threats:', error);
    return { threats: [], total: 0, hasMore: false };
  }
}

/**
 * Update threat status
 */
export async function updateThreatStatus(
  threatId: string,
  status: ThreatStatus,
  userId: string,
  metadata?: { resolution?: string; notes?: string }
): Promise<boolean> {
  try {
    const updates: any = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    if (status === 'ACKNOWLEDGED') {
      updates.acknowledgedBy = userId;
      updates.acknowledgedAt = FieldValue.serverTimestamp();
    } else if (status === 'RESOLVED' || status === 'FALSE_POSITIVE') {
      updates.resolvedBy = userId;
      updates.resolvedAt = FieldValue.serverTimestamp();
      if (metadata?.resolution) {
        updates.resolution = metadata.resolution;
      }
    }
    
    if (metadata?.notes) {
      updates.notes = metadata.notes;
    }
    
    await adminDb.collection(THREATS_COLLECTION).doc(threatId).update(updates);
    return true;
  } catch (error) {
    console.error('Failed to update threat status:', error);
    return false;
  }
}

/**
 * Delete a threat (superadmin only)
 */
export async function deleteThreat(threatId: string): Promise<boolean> {
  try {
    await adminDb.collection(THREATS_COLLECTION).doc(threatId).delete();
    return true;
  } catch (error) {
    console.error('Failed to delete threat:', error);
    return false;
  }
}

/**
 * Get threat statistics
 */
export async function getThreatStats(days: number = 30): Promise<ThreatStats> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all threats in date range
    const snapshot = await adminDb.collection(THREATS_COLLECTION)
      .where('detectedAt', '>=', startDate)
      .get();
    
    const threats = snapshot.docs.map((doc: any) => doc.data());
    
    // Calculate statistics
    const bySeverity: Record<ThreatSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const byStatus: Record<ThreatStatus, number> = { ACTIVE: 0, ACKNOWLEDGED: 0, RESOLVED: 0, FALSE_POSITIVE: 0 };
    const byRule: Record<string, number> = {};
    
    let activeCount = 0;
    let criticalCount = 0;
    let todayCount = 0;
    
    // Group by date for trends
    const byDate: Record<string, number> = {};
    
    for (const threat of threats) {
      // Severity count
      if (threat.severity) {
        bySeverity[threat.severity as ThreatSeverity] = (bySeverity[threat.severity as ThreatSeverity] || 0) + 1;
      }
      
      // Status count
      if (threat.status) {
        byStatus[threat.status as ThreatStatus] = (byStatus[threat.status as ThreatStatus] || 0) + 1;
      }
      
      // Rule count
      if (threat.ruleName) {
        byRule[threat.ruleName] = (byRule[threat.ruleName] || 0) + 1;
      }
      
      // Active count
      if (threat.status === 'ACTIVE' || threat.status === 'ACKNOWLEDGED') {
        activeCount++;
      }
      
      // Critical count
      if (threat.severity === 'CRITICAL' && (threat.status === 'ACTIVE' || threat.status === 'ACKNOWLEDGED')) {
        criticalCount++;
      }
      
      // Today's count
      const threatDate = threat.detectedAt?.toDate?.() || new Date(threat.detectedAt);
      if (threatDate >= today) {
        todayCount++;
      }
      
      // Trends by date
      const dateKey = threatDate.toISOString().split('T')[0];
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    }
    
    // Build trends array (last 7 days)
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trends.push({
        date: dateKey,
        count: byDate[dateKey] || 0,
      });
    }
    
    return {
      total: threats.length,
      bySeverity,
      byStatus,
      byRule,
      activeCount,
      criticalCount,
      todayCount,
      trends,
    };
  } catch (error) {
    console.error('Failed to get threat stats:', error);
    return {
      total: 0,
      bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byStatus: { ACTIVE: 0, ACKNOWLEDGED: 0, RESOLVED: 0, FALSE_POSITIVE: 0 },
      byRule: {},
      activeCount: 0,
      criticalCount: 0,
      todayCount: 0,
      trends: [],
    };
  }
}

/**
 * Get related threats from the same source
 */
export async function getRelatedThreats(
  sourceType: string,
  sourceValue: string,
  excludeId?: string,
  limit: number = 10
): Promise<StoredThreat[]> {
  try {
    let query = adminDb.collection(THREATS_COLLECTION)
      .where('source.type', '==', sourceType)
      .where('source.value', '==', sourceValue)
      .orderBy('detectedAt', 'desc')
      .limit(limit);
    
    const snapshot = await query.get();
    
    return snapshot.docs
      .filter((doc: any) => doc.id !== excludeId)
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          detectedAt: data.detectedAt?.toDate?.() || data.detectedAt,
          acknowledgedAt: data.acknowledgedAt?.toDate?.(),
          resolvedAt: data.resolvedAt?.toDate?.(),
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        } as StoredThreat;
      });
  } catch (error) {
    console.error('Failed to get related threats:', error);
    return [];
  }
}

/**
 * Cleanup old resolved threats
 */
export async function cleanupOldThreats(days: number = 30): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const snapshot = await adminDb.collection(THREATS_COLLECTION)
      .where('status', 'in', ['RESOLVED', 'FALSE_POSITIVE'])
      .where('resolvedAt', '<=', cutoff)
      .get();
    
    const batch = adminDb.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      // Firestore batch limit is 500
      if (count % 500 === 0) {
        await batch.commit();
      }
    }
    
    await batch.commit();
    console.log(`Cleaned up ${count} old threats`);
    return count;
  } catch (error) {
    console.error('Failed to cleanup old threats:', error);
    return 0;
  }
}

/**
 * Check if a threat with the same rule and source already exists
 */
export async function existingThreatExists(
  ruleId: string,
  sourceValue: string,
  status: ThreatStatus[] = ['ACTIVE', 'ACKNOWLEDGED']
): Promise<boolean> {
  try {
    const snapshot = await adminDb.collection(THREATS_COLLECTION)
      .where('ruleId', '==', ruleId)
      .where('source.value', '==', sourceValue)
      .where('status', 'in', status)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Failed to check existing threat:', error);
    return false;
  }
}
