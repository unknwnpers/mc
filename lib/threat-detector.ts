/**
 * Threat Detection Engine
 * Monitors security events and detects suspicious patterns
 */

import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Redis } from '@upstash/redis';

// Initialize Redis for threat detection caching
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ThreatStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface ThreatRule {
  id: string;
  name: string;
  description: string;
  severity: ThreatSeverity;
  enabled: boolean;
  timeWindow: number; // minutes
  threshold: number;
  condition: ThreatCondition;
}

export interface ThreatCondition {
  type: 'FAILED_LOGIN' | 'RATE_LIMIT' | 'SUSPICIOUS_IP' | 'UNUSUAL_TIME' | 'GEO_ANOMALY' | 'CREDENTIAL_STUFFING' | 'PRIVILEGE_ESCALATION';
  operator: '>' | '>=' | '==' | 'contains';
  value: any;
}

export interface DetectedThreat {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: ThreatSeverity;
  source: {
    type: 'IP' | 'USER' | 'SESSION';
    value: string;
  };
  description: string;
  evidence: any[];
  detectedAt: Date;
  status: ThreatStatus;
  autoBlocked: boolean;
}

export interface SecurityLog {
  id: string;
  type: string;
  action: string;
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILED';
  metadata?: any;
  timestamp: Date | Timestamp;
}

// Built-in threat detection rules
const defaultRules: ThreatRule[] = [
  {
    id: 'brute-force',
    name: 'Brute Force Attack',
    description: 'Multiple failed login attempts from the same IP address',
    severity: 'HIGH',
    enabled: true,
    timeWindow: 5,
    threshold: 5,
    condition: { type: 'FAILED_LOGIN', operator: '>=', value: 5 },
  },
  {
    id: 'credential-stuffing',
    name: 'Credential Stuffing',
    description: 'Failed logins with different usernames from the same IP',
    severity: 'CRITICAL',
    enabled: true,
    timeWindow: 10,
    threshold: 10,
    condition: { type: 'CREDENTIAL_STUFFING', operator: '>=', value: 10 },
  },
  {
    id: 'rate-limit-evasion',
    name: 'Rate Limit Evasion',
    description: 'Requests just under rate limit threshold (suspicious pattern)',
    severity: 'MEDIUM',
    enabled: true,
    timeWindow: 1,
    threshold: 15,
    condition: { type: 'RATE_LIMIT', operator: '>=', value: 15 },
  },
  {
    id: 'off-hours-access',
    name: 'Off-Hours Admin Access',
    description: 'Admin login during unusual hours (11 PM - 5 AM)',
    severity: 'MEDIUM',
    enabled: true,
    timeWindow: 1,
    threshold: 1,
    condition: { type: 'UNUSUAL_TIME', operator: '>=', value: 1 },
  },
  {
    id: 'privilege-escalation',
    name: 'Privilege Escalation Attempt',
    description: 'Multiple permission changes in short time',
    severity: 'HIGH',
    enabled: true,
    timeWindow: 5,
    threshold: 3,
    condition: { type: 'PRIVILEGE_ESCALATION', operator: '>=', value: 3 },
  },
];

const THREATS_COLLECTION = 'security_threats';
const RULES_COLLECTION = 'security_threat_rules';
const THREAT_CACHE_TTL = 300; // 5 minutes

/**
 * Initialize default threat rules in Firestore
 */
export async function initializeThreatRules(): Promise<void> {
  try {
    const batch = adminDb.batch();
    
    for (const rule of defaultRules) {
      const docRef = adminDb.collection(RULES_COLLECTION).doc(rule.id);
      const existing = await docRef.get();
      
      if (!existing.exists) {
        batch.set(docRef, {
          ...rule,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Failed to initialize threat rules:', error);
  }
}

/**
 * Get all threat rules
 */
export async function getThreatRules(): Promise<ThreatRule[]> {
  try {
    const snapshot = await adminDb.collection(RULES_COLLECTION).get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ThreatRule));
  } catch (error) {
    console.error('Failed to fetch threat rules:', error);
    return defaultRules;
  }
}

/**
 * Update a threat rule
 */
export async function updateThreatRule(
  ruleId: string,
  updates: Partial<ThreatRule>
): Promise<boolean> {
  try {
    await adminDb.collection(RULES_COLLECTION).doc(ruleId).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Failed to update threat rule:', error);
    return false;
  }
}

/**
 * Get recent security events from cache or Firestore
 */
async function getRecentEvents(
  timeWindowMinutes: number,
  filters?: { ip?: string; userId?: string; type?: string }
): Promise<SecurityLog[]> {
  const cacheKey = `events:${timeWindowMinutes}:${filters?.ip || ''}:${filters?.userId || ''}`;
  
  // Try Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
  }
  
  // Query Firestore
  try {
    const cutoff = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    let query: any = adminDb.collection('security_logs')
      .where('timestamp', '>=', cutoff)
      .orderBy('timestamp', 'desc');
    
    if (filters?.ip) {
      query = query.where('ip', '==', filters.ip);
    }
    if (filters?.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters?.type) {
      query = query.where('type', '==', filters.type);
    }
    
    const snapshot = await query.limit(100).get();
    const events = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp,
    }));
    
    // Cache in Redis
    if (redis) {
      try {
        await redis.setex(cacheKey, 60, JSON.stringify(events));
      } catch (error) {
        console.error('Cache write error:', error);
      }
    }
    
    return events;
  } catch (error) {
    console.error('Failed to fetch recent events:', error);
    return [];
  }
}

/**
 * Check if an active threat already exists for this source and rule
 */
async function existingThreatExists(
  ruleId: string,
  sourceValue: string
): Promise<boolean> {
  try {
    const snapshot = await adminDb.collection(THREATS_COLLECTION)
      .where('ruleId', '==', ruleId)
      .where('source.value', '==', sourceValue)
      .where('status', 'in', ['ACTIVE', 'ACKNOWLEDGED'])
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Failed to check existing threat:', error);
    return false;
  }
}

/**
 * Detect threats from a single security event
 */
export async function detectThreats(log: SecurityLog): Promise<DetectedThreat[]> {
  const detectedThreats: DetectedThreat[] = [];
  
  try {
    const rules = await getThreatRules();
    const enabledRules = rules.filter(r => r.enabled);
    
    for (const rule of enabledRules) {
      const threat = await evaluateRule(rule, log);
      if (threat) {
        // Check if similar threat already exists
        const exists = await existingThreatExists(rule.id, threat.source.value);
        if (!exists) {
          detectedThreats.push(threat);
        }
      }
    }
  } catch (error) {
    console.error('Threat detection error:', error);
  }
  
  return detectedThreats;
}

/**
 * Evaluate a single rule against current context
 */
async function evaluateRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  const condition = rule.condition;
  
  switch (condition.type) {
    case 'FAILED_LOGIN':
      return evaluateFailedLoginRule(rule, log);
    case 'CREDENTIAL_STUFFING':
      return evaluateCredentialStuffingRule(rule, log);
    case 'RATE_LIMIT':
      return evaluateRateLimitRule(rule, log);
    case 'UNUSUAL_TIME':
      return evaluateUnusualTimeRule(rule, log);
    case 'PRIVILEGE_ESCALATION':
      return evaluatePrivilegeEscalationRule(rule, log);
    default:
      return null;
  }
}

/**
 * Evaluate brute force attack rule
 */
async function evaluateFailedLoginRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  if (log.type !== 'AUTH' || log.status !== 'FAILED' || !log.ip) {
    return null;
  }
  
  const events = await getRecentEvents(rule.timeWindow, { ip: log.ip, type: 'AUTH' });
  const failedLogins = events.filter((e: SecurityLog) => e.status === 'FAILED');
  
  if (failedLogins.length >= rule.threshold) {
    return {
      id: generateThreatId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      source: { type: 'IP', value: log.ip },
      description: `${failedLogins.length} failed login attempts from ${log.ip} in ${rule.timeWindow} minutes`,
      evidence: failedLogins.slice(0, 10),
      detectedAt: new Date(),
      status: 'ACTIVE',
      autoBlocked: rule.severity === 'CRITICAL',
    };
  }
  
  return null;
}

/**
 * Evaluate credential stuffing rule
 */
async function evaluateCredentialStuffingRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  if (log.type !== 'AUTH' || log.status !== 'FAILED' || !log.ip) {
    return null;
  }
  
  const events = await getRecentEvents(rule.timeWindow, { ip: log.ip, type: 'AUTH' });
  const failedLogins = events.filter((e: SecurityLog) => e.status === 'FAILED');
  
  // Count unique user IDs (different usernames)
  const uniqueUserIds = new Set(failedLogins.map((e: SecurityLog) => e.userId || e.metadata?.email).filter(Boolean));
  
  if (uniqueUserIds.size >= rule.threshold) {
    return {
      id: generateThreatId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      source: { type: 'IP', value: log.ip },
      description: `Credential stuffing attack: ${uniqueUserIds.size} different usernames from ${log.ip} in ${rule.timeWindow} minutes`,
      evidence: failedLogins.slice(0, 10),
      detectedAt: new Date(),
      status: 'ACTIVE',
      autoBlocked: true,
    };
  }
  
  return null;
}

/**
 * Evaluate rate limit evasion rule
 */
async function evaluateRateLimitRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  if (!log.ip) return null;
  
  const events = await getRecentEvents(rule.timeWindow, { ip: log.ip });
  
  if (events.length >= rule.threshold) {
    return {
      id: generateThreatId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      source: { type: 'IP', value: log.ip },
      description: `High request rate: ${events.length} requests from ${log.ip} in ${rule.timeWindow} minutes`,
      evidence: events.slice(0, 10),
      detectedAt: new Date(),
      status: 'ACTIVE',
      autoBlocked: false,
    };
  }
  
  return null;
}

/**
 * Evaluate off-hours access rule
 */
async function evaluateUnusualTimeRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  if (log.type !== 'AUTH' || log.status !== 'SUCCESS' || log.role !== 'admin' && log.role !== 'superadmin') {
    return null;
  }
  
  const hour = new Date().getHours();
  const isOffHours = hour >= 23 || hour < 5;
  
  if (isOffHours && log.userId) {
    return {
      id: generateThreatId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      source: { type: 'USER', value: log.userId },
      description: `Admin login at unusual hour (${hour}:00) by ${log.userId}`,
      evidence: [log],
      detectedAt: new Date(),
      status: 'ACTIVE',
      autoBlocked: false,
    };
  }
  
  return null;
}

/**
 * Evaluate privilege escalation rule
 */
async function evaluatePrivilegeEscalationRule(rule: ThreatRule, log: SecurityLog): Promise<DetectedThreat | null> {
  if (log.type !== 'ADMIN_ACTION' || !log.userId) {
    return null;
  }
  
  const privilegedActions = ['UPDATE_ROLE', 'BLOCK_USER', 'DELETE_USER', 'POLICY_UPDATED'];
  if (!privilegedActions.includes(log.action)) {
    return null;
  }
  
  const events = await getRecentEvents(rule.timeWindow, { userId: log.userId, type: 'ADMIN_ACTION' });
  const privilegedEvents = events.filter((e: SecurityLog) => privilegedActions.includes(e.action));
  
  if (privilegedEvents.length >= rule.threshold) {
    return {
      id: generateThreatId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      source: { type: 'USER', value: log.userId },
      description: `Multiple privilege changes (${privilegedEvents.length}) by ${log.userId} in ${rule.timeWindow} minutes`,
      evidence: privilegedEvents.slice(0, 10),
      detectedAt: new Date(),
      status: 'ACTIVE',
      autoBlocked: false,
    };
  }
  
  return null;
}

/**
 * Generate unique threat ID
 */
function generateThreatId(): string {
  return `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Analyze batch of events for threats
 */
export async function analyzeSecurityEvents(events: SecurityLog[]): Promise<DetectedThreat[]> {
  const allThreats: DetectedThreat[] = [];
  
  for (const event of events) {
    const threats = await detectThreats(event);
    allThreats.push(...threats);
  }
  
  return allThreats;
}

/**
 * Get active threats
 */
export async function getActiveThreats(limit: number = 50): Promise<DetectedThreat[]> {
  try {
    const snapshot = await adminDb.collection(THREATS_COLLECTION)
      .where('status', 'in', ['ACTIVE', 'ACKNOWLEDGED'])
      .orderBy('detectedAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      detectedAt: doc.data().detectedAt?.toDate?.() || doc.data().detectedAt,
      acknowledgedAt: doc.data().acknowledgedAt?.toDate?.(),
      resolvedAt: doc.data().resolvedAt?.toDate?.(),
    } as DetectedThreat));
  } catch (error) {
    console.error('Failed to fetch active threats:', error);
    return [];
  }
}

/**
 * Acknowledge a threat
 */
export async function acknowledgeThreat(
  threatId: string,
  userId: string
): Promise<boolean> {
  try {
    await adminDb.collection(THREATS_COLLECTION).doc(threatId).update({
      status: 'ACKNOWLEDGED',
      acknowledgedBy: userId,
      acknowledgedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Failed to acknowledge threat:', error);
    return false;
  }
}

/**
 * Resolve a threat
 */
export async function resolveThreat(
  threatId: string,
  userId: string,
  resolution: string
): Promise<boolean> {
  try {
    await adminDb.collection(THREATS_COLLECTION).doc(threatId).update({
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: FieldValue.serverTimestamp(),
      resolution,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Failed to resolve threat:', error);
    return false;
  }
}

/**
 * Mark threat as false positive
 */
export async function markFalsePositive(
  threatId: string,
  userId: string
): Promise<boolean> {
  try {
    await adminDb.collection(THREATS_COLLECTION).doc(threatId).update({
      status: 'FALSE_POSITIVE',
      resolvedBy: userId,
      resolvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Failed to mark false positive:', error);
    return false;
  }
}
