/**
 * Alert Service
 * Multi-channel alerting system for security threats
 */

import { adminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Redis } from '@upstash/redis';
import type { DetectedThreat, ThreatSeverity } from './threat-detector';

// Initialize Redis for alert throttling
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export type AlertChannelType = 'EMAIL' | 'WEBHOOK' | 'DASHBOARD' | 'SLACK';

export interface AlertChannel {
  type: AlertChannelType;
  enabled: boolean;
  config: AlertChannelConfig;
}

export type AlertChannelConfig = 
  | { recipient: string; fromName?: string }
  | { url: string; headers?: Record<string, string> }
  | { webhookUrl: string; channel?: string; username?: string }
  | Record<string, never>; // Empty object for DASHBOARD

export interface AlertConfig {
  minSeverity: ThreatSeverity;
  channels: AlertChannel[];
  throttleMinutes: number;
  digestEnabled: boolean;
  digestFrequency: 'HOURLY' | 'DAILY';
  autoBlockCritical: boolean;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface AlertResult {
  channel: AlertChannelType;
  success: boolean;
  error?: string;
  sentAt: Date;
}

const ALERT_CONFIG_DOC = 'config';
const ALERT_CONFIG_COLLECTION = 'security_alert_config';

// Default alert configuration
const defaultAlertConfig: AlertConfig = {
  minSeverity: 'HIGH',
  channels: [
    { type: 'DASHBOARD', enabled: true, config: {} },
  ],
  throttleMinutes: 5,
  digestEnabled: false,
  digestFrequency: 'DAILY',
  autoBlockCritical: true,
};

/**
 * Get alert configuration
 */
export async function getAlertConfig(): Promise<AlertConfig> {
  try {
    const doc = await adminDb.collection(ALERT_CONFIG_COLLECTION).doc(ALERT_CONFIG_DOC).get();
    
    if (doc.exists) {
      const data = doc.data()!;
      return {
        ...defaultAlertConfig,
        ...data,
        updatedAt: data.updatedAt?.toDate?.(),
      };
    }
    
    // Create default config if none exists
    await adminDb.collection(ALERT_CONFIG_COLLECTION).doc(ALERT_CONFIG_DOC).set({
      ...defaultAlertConfig,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return defaultAlertConfig;
  } catch (error) {
    console.error('Failed to get alert config:', error);
    return defaultAlertConfig;
  }
}

/**
 * Update alert configuration
 */
export async function updateAlertConfig(
  config: Partial<AlertConfig>,
  userId: string
): Promise<boolean> {
  try {
    await adminDb.collection(ALERT_CONFIG_COLLECTION).doc(ALERT_CONFIG_DOC).update({
      ...config,
      updatedBy: userId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Failed to update alert config:', error);
    return false;
  }
}

/**
 * Check if alert should be throttled for this source
 */
export async function shouldThrottle(
  source: string,
  ruleId: string,
  throttleMinutes: number
): Promise<boolean> {
  if (!redis || throttleMinutes <= 0) {
    return false;
  }
  
  const cacheKey = `alert:${source}:${ruleId}`;
  
  try {
    const exists = await redis.exists(cacheKey);
    if (exists) {
      return true;
    }
    
    // Set throttle key
    await redis.setex(cacheKey, throttleMinutes * 60, '1');
    return false;
  } catch (error) {
    console.error('Throttle check error:', error);
    return false;
  }
}

/**
 * Send alert through all configured channels
 */
export async function sendAlert(
  threat: DetectedThreat,
  config?: AlertConfig
): Promise<AlertResult[]> {
  const alertConfig = config || await getAlertConfig();
  const results: AlertResult[] = [];
  
  // Check severity threshold
  const severityLevels: ThreatSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const threatLevel = severityLevels.indexOf(threat.severity);
  const minLevel = severityLevels.indexOf(alertConfig.minSeverity);
  
  if (threatLevel < minLevel) {
    return [{ channel: 'DASHBOARD', success: true, sentAt: new Date() }];
  }
  
  // Check throttling
  const throttled = await shouldThrottle(
    threat.source.value,
    threat.ruleId,
    alertConfig.throttleMinutes
  );
  
  if (throttled) {
    console.log(`Alert throttled for ${threat.source.value} - ${threat.ruleId}`);
  }
  
  // Send through each enabled channel
  for (const channel of alertConfig.channels) {
    if (!channel.enabled) continue;
    
    // Skip non-dashboard channels if throttled (dashboard always shows)
    if (throttled && channel.type !== 'DASHBOARD') continue;
    
    try {
      const result = await sendToChannel(threat, channel);
      results.push(result);
    } catch (error: any) {
      results.push({
        channel: channel.type,
        success: false,
        error: error.message,
        sentAt: new Date(),
      });
    }
  }
  
  return results;
}

/**
 * Send alert to a specific channel
 */
async function sendToChannel(
  threat: DetectedThreat,
  channel: AlertChannel
): Promise<AlertResult> {
  switch (channel.type) {
    case 'DASHBOARD':
      return { channel: 'DASHBOARD', success: true, sentAt: new Date() };
    
    case 'EMAIL':
      return sendEmailAlert(threat, channel.config as { recipient: string });
    
    case 'WEBHOOK':
      return sendWebhookAlert(threat, channel.config as { url: string; headers?: Record<string, string> });
    
    case 'SLACK':
      return sendSlackAlert(threat, channel.config as { webhookUrl: string; channel?: string });
    
    default:
      return { channel: channel.type, success: false, error: 'Unknown channel type', sentAt: new Date() };
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(
  threat: DetectedThreat,
  config: { recipient: string }
): Promise<AlertResult> {
  try {
    // Check if SendGrid API key is configured
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) {
      return { channel: 'EMAIL', success: false, error: 'SendGrid not configured', sentAt: new Date() };
    }
    
    // For now, log the email that would be sent
    // In production, integrate with SendGrid or similar service
    console.log(`[EMAIL ALERT] Would send to ${config.recipient}:`, {
      subject: `Security Alert: ${threat.severity} - ${threat.ruleName}`,
      threat: threat.id,
      description: threat.description,
    });
    
    // TODO: Implement actual SendGrid integration
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(sendgridKey);
    // await sgMail.send({...});
    
    return { channel: 'EMAIL', success: true, sentAt: new Date() };
  } catch (error: any) {
    console.error('Email alert error:', error);
    return { channel: 'EMAIL', success: false, error: error.message, sentAt: new Date() };
  }
}

/**
 * Send webhook alert
 */
async function sendWebhookAlert(
  threat: DetectedThreat,
  config: { url: string; headers?: Record<string, string> }
): Promise<AlertResult> {
  try {
    const payload = {
      alert: 'security_threat',
      severity: threat.severity,
      rule: threat.ruleName,
      description: threat.description,
      source: threat.source,
      detectedAt: threat.detectedAt,
      evidence: threat.evidence,
    };
    
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
    
    return { channel: 'WEBHOOK', success: true, sentAt: new Date() };
  } catch (error: any) {
    console.error('Webhook alert error:', error);
    return { channel: 'WEBHOOK', success: false, error: error.message, sentAt: new Date() };
  }
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(
  threat: DetectedThreat,
  config: { webhookUrl: string; channel?: string }
): Promise<AlertResult> {
  try {
    const severityColors: Record<string, string> = {
      LOW: '#36a64f',
      MEDIUM: '#daa520',
      HIGH: '#ff9900',
      CRITICAL: '#ff0000',
    };
    
    const payload = {
      channel: config.channel,
      username: 'Security Alert Bot',
      icon_emoji: ':warning:',
      attachments: [
        {
          color: severityColors[threat.severity] || '#36a64f',
          title: `Security Threat Detected: ${threat.ruleName}`,
          text: threat.description,
          fields: [
            {
              title: 'Severity',
              value: threat.severity,
              short: true,
            },
            {
              title: 'Source',
              value: `${threat.source.type}: ${threat.source.value}`,
              short: true,
            },
            {
              title: 'Detected At',
              value: new Date(threat.detectedAt).toLocaleString(),
              short: true,
            },
            {
              title: 'Auto Blocked',
              value: threat.autoBlocked ? 'Yes' : 'No',
              short: true,
            },
          ],
          footer: 'Security Dashboard',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };
    
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}`);
    }
    
    return { channel: 'SLACK', success: true, sentAt: new Date() };
  } catch (error: any) {
    console.error('Slack alert error:', error);
    return { channel: 'SLACK', success: false, error: error.message, sentAt: new Date() };
  }
}

/**
 * Test an alert channel
 */
export async function testChannel(
  channel: AlertChannel
): Promise<AlertResult> {
  const testThreat: DetectedThreat = {
    id: 'test-threat',
    ruleId: 'test',
    ruleName: 'Test Alert',
    severity: 'MEDIUM',
    source: { type: 'IP', value: '127.0.0.1' },
    description: 'This is a test alert to verify channel configuration',
    evidence: [],
    detectedAt: new Date(),
    status: 'ACTIVE',
    autoBlocked: false,
  };
  
  return sendToChannel(testThreat, channel);
}

/**
 * Send digest of recent threats
 */
export async function sendDigest(
  threats: DetectedThreat[],
  config?: AlertConfig
): Promise<AlertResult[]> {
  const alertConfig = config || await getAlertConfig();
  
  if (!alertConfig.digestEnabled || threats.length === 0) {
    return [];
  }
  
  const results: AlertResult[] = [];
  
  // Group by severity
  const bySeverity: Record<string, number> = {};
  for (const threat of threats) {
    bySeverity[threat.severity] = (bySeverity[threat.severity] || 0) + 1;
  }
  
  // Send digest through email channels
  for (const channel of alertConfig.channels) {
    if (!channel.enabled || channel.type !== 'EMAIL') continue;
    
    try {
      const emailConfig = channel.config as { recipient: string };
      console.log(`[DIGEST EMAIL] Would send to ${emailConfig.recipient}:`, {
        subject: `Security Digest: ${threats.length} threats detected`,
        summary: bySeverity,
      });
      
      results.push({ channel: 'EMAIL', success: true, sentAt: new Date() });
    } catch (error: any) {
      results.push({ channel: 'EMAIL', success: false, error: error.message, sentAt: new Date() });
    }
  }
  
  return results;
}

/**
 * Get channels that successfully notified for a threat
 */
export function getNotifiedChannels(results: AlertResult[]): string[] {
  return results
    .filter(r => r.success)
    .map(r => r.channel);
}
