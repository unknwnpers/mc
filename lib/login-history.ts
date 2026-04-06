/**
 * Login History Tracking
 * Tracks admin login attempts and detects new devices/locations
 */

import { adminDb } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'crypto';

export interface LoginRecord {
  id: string;
  userId: string;
  userEmail: string;
  ip: string;
  userAgent: string;
  deviceFingerprint: string;
  location?: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  timestamp: Date;
  isNewDevice: boolean;
  isNewLocation: boolean;
  notificationSent: boolean;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceFingerprint: string;
  deviceName: string;
  browser: string;
  os: string;
  location?: string;
  firstSeen: Date;
  lastUsed: Date;
  isTrusted: boolean;
}

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  isMobile: boolean;
  isDesktop: boolean;
}

const LOGIN_HISTORY_COLLECTION = 'login_history';
const TRUSTED_DEVICES_COLLECTION = 'trusted_devices';

/**
 * Create a device fingerprint from user agent and IP
 * Uses a hash to avoid storing raw identifiable info
 */
export function createDeviceFingerprint(userAgent: string, ip: string): string {
  // Combine user agent parts with IP for fingerprint
  const data = `${userAgent}:${ip}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Parse user agent string to extract device info
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();
  
  // Browser detection
  let browser = 'Unknown';
  let browserVersion = '';
  
  if (ua.includes('firefox')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+\.?\d*)/);
    browserVersion = match?.[1] || '';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
    const match = ua.match(/edg\/(\d+\.?\d*)/);
    browserVersion = match?.[1] || '';
  } else if (ua.includes('chrome')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+\.?\d*)/);
    browserVersion = match?.[1] || '';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+\.?\d*)/);
    browserVersion = match?.[1] || '';
  }
  
  // OS detection
  let os = 'Unknown';
  let osVersion = '';
  
  if (ua.includes('windows nt 10')) {
    os = 'Windows';
    osVersion = '10/11';
  } else if (ua.includes('windows nt 6.3')) {
    os = 'Windows';
    osVersion = '8.1';
  } else if (ua.includes('windows nt 6.2')) {
    os = 'Windows';
    osVersion = '8';
  } else if (ua.includes('windows nt 6.1')) {
    os = 'Windows';
    osVersion = '7';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    osVersion = match?.[1]?.replace('_', '.') || '';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android (\d+\.?\d*)/);
    osVersion = match?.[1] || '';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    const match = ua.match(/os (\d+_\d+)/);
    osVersion = match?.[1]?.replace('_', '.') || '';
  }
  
  // Device type
  const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);
  const isDesktop = !isMobile;
  
  let device = 'Desktop';
  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android')) device = 'Android Device';
  else if (isMobile) device = 'Mobile Device';
  
  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    isMobile,
    isDesktop,
  };
}

/**
 * Get location info from IP address
 * Uses ipapi.co free tier (45 requests per minute)
 */
export async function getLocationFromIP(ip: string): Promise<LoginRecord['location'] | null> {
  try {
    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { country: 'Local', city: 'Development' };
    }
    
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      country: data.country_name,
      city: data.city,
      region: data.region,
      timezone: data.timezone,
    };
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return null;
  }
}

/**
 * Check if this is a new device for the user
 */
export async function isNewDevice(userId: string, fingerprint: string): Promise<boolean> {
  try {
    const snapshot = await adminDb
      .collection(LOGIN_HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceFingerprint', '==', fingerprint)
      .limit(1)
      .get();
    
    return snapshot.empty;
  } catch (error) {
    console.error('Failed to check device:', error);
    return false; // Assume not new on error
  }
}

/**
 * Check if this is a new location for the user
 */
export async function isNewLocation(userId: string, ip: string): Promise<boolean> {
  try {
    const snapshot = await adminDb
      .collection(LOGIN_HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .where('ip', '==', ip)
      .limit(1)
      .get();
    
    return snapshot.empty;
  } catch (error) {
    console.error('Failed to check location:', error);
    return false; // Assume not new on error
  }
}

/**
 * Record a login attempt
 */
export async function recordLogin(
  userId: string,
  userEmail: string,
  ip: string,
  userAgent: string
): Promise<LoginRecord> {
  try {
    const fingerprint = createDeviceFingerprint(userAgent, ip);
    const isNewDeviceFlag = await isNewDevice(userId, fingerprint);
    const isNewLocationFlag = await isNewLocation(userId, ip);
    const location = await getLocationFromIP(ip);
    
    const loginData = {
      userId,
      userEmail,
      ip,
      userAgent,
      deviceFingerprint: fingerprint,
      location,
      timestamp: FieldValue.serverTimestamp(),
      isNewDevice: isNewDeviceFlag,
      isNewLocation: isNewLocationFlag,
      notificationSent: false,
    };
    
    const docRef = await adminDb.collection(LOGIN_HISTORY_COLLECTION).add(loginData);
    
    // Update trusted device last used
    await updateTrustedDeviceLastUsed(userId, fingerprint);
    
    return {
      id: docRef.id,
      ...loginData,
      timestamp: new Date(),
    } as LoginRecord;
  } catch (error) {
    console.error('Failed to record login:', error);
    throw error;
  }
}

/**
 * Get recent login history for a user
 */
export async function getRecentLogins(
  userId: string,
  limit: number = 10
): Promise<LoginRecord[]> {
  try {
    const snapshot = await adminDb
      .collection(LOGIN_HISTORY_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userEmail: data.userEmail,
        ip: data.ip,
        userAgent: data.userAgent,
        deviceFingerprint: data.deviceFingerprint,
        location: data.location,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        isNewDevice: data.isNewDevice,
        isNewLocation: data.isNewLocation,
        notificationSent: data.notificationSent,
      };
    });
  } catch (error) {
    console.error('Failed to get login history:', error);
    return [];
  }
}

/**
 * Get trusted devices for a user
 */
export async function getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
  try {
    const snapshot = await adminDb
      .collection(TRUSTED_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .where('isTrusted', '==', true)
      .orderBy('lastUsed', 'desc')
      .get();
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        deviceFingerprint: data.deviceFingerprint,
        deviceName: data.deviceName,
        browser: data.browser,
        os: data.os,
        location: data.location,
        firstSeen: data.firstSeen?.toDate?.() || new Date(),
        lastUsed: data.lastUsed?.toDate?.() || new Date(),
        isTrusted: data.isTrusted,
      };
    });
  } catch (error) {
    console.error('Failed to get trusted devices:', error);
    return [];
  }
}

/**
 * Trust a device for a user
 */
export async function trustDevice(
  userId: string,
  fingerprint: string,
  deviceInfo: DeviceInfo,
  location?: string
): Promise<void> {
  try {
    // Check if already exists
    const snapshot = await adminDb
      .collection(TRUSTED_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceFingerprint', '==', fingerprint)
      .limit(1)
      .get();
    
    const deviceName = `${deviceInfo.device} - ${deviceInfo.browser}`;
    
    if (snapshot.empty) {
      // Create new trusted device
      await adminDb.collection(TRUSTED_DEVICES_COLLECTION).add({
        userId,
        deviceFingerprint: fingerprint,
        deviceName,
        browser: `${deviceInfo.browser} ${deviceInfo.browserVersion}`,
        os: `${deviceInfo.os} ${deviceInfo.osVersion}`,
        location,
        firstSeen: FieldValue.serverTimestamp(),
        lastUsed: FieldValue.serverTimestamp(),
        isTrusted: true,
      });
    } else {
      // Update existing
      await snapshot.docs[0].ref.update({
        isTrusted: true,
        lastUsed: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Failed to trust device:', error);
    throw error;
  }
}

/**
 * Untrust/remove a device
 */
export async function untrustDevice(userId: string, deviceId: string): Promise<void> {
  try {
    await adminDb.collection(TRUSTED_DEVICES_COLLECTION).doc(deviceId).update({
      isTrusted: false,
      untrustedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to untrust device:', error);
    throw error;
  }
}

/**
 * Remove all trusted devices for a user
 */
export async function untrustAllDevices(userId: string): Promise<number> {
  try {
    const snapshot = await adminDb
      .collection(TRUSTED_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .where('isTrusted', '==', true)
      .get();
    
    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isTrusted: false,
        untrustedAt: FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error('Failed to untrust all devices:', error);
    throw error;
  }
}

/**
 * Check if a device is trusted
 */
export async function isTrustedDevice(
  userId: string,
  fingerprint: string
): Promise<boolean> {
  try {
    const snapshot = await adminDb
      .collection(TRUSTED_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceFingerprint', '==', fingerprint)
      .where('isTrusted', '==', true)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error('Failed to check trusted device:', error);
    return false;
  }
}

/**
 * Update last used timestamp for trusted device
 */
async function updateTrustedDeviceLastUsed(
  userId: string,
  fingerprint: string
): Promise<void> {
  try {
    const snapshot = await adminDb
      .collection(TRUSTED_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .where('deviceFingerprint', '==', fingerprint)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        lastUsed: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Failed to update device last used:', error);
  }
}

/**
 * Mark login notification as sent
 */
export async function markNotificationSent(loginId: string): Promise<void> {
  try {
    await adminDb.collection(LOGIN_HISTORY_COLLECTION).doc(loginId).update({
      notificationSent: true,
      notificationSentAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to mark notification sent:', error);
  }
}

/**
 * Detect suspicious login patterns
 */
export async function detectSuspiciousLogin(
  userId: string,
  ip: string,
  fingerprint: string
): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  
  try {
    // Check for multiple failed attempts from same IP
    const recentLogins = await getRecentLogins(userId, 20);
    const failedAttempts = recentLogins.filter(
      (login) => login.ip === ip && login.timestamp > new Date(Date.now() - 15 * 60 * 1000)
    ).length;
    
    if (failedAttempts > 3) {
      reasons.push('Multiple recent attempts from same IP');
    }
    
    // Check for rapid location changes (impossible travel)
    if (recentLogins.length > 0) {
      const lastLogin = recentLogins[0];
      const timeDiff = Date.now() - lastLogin.timestamp.getTime();
      const isNewLoc = await isNewLocation(userId, ip);
      
      // If new location within 1 hour of last login
      if (isNewLoc && timeDiff < 60 * 60 * 1000) {
        reasons.push('Rapid location change detected');
      }
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  } catch (error) {
    console.error('Failed to detect suspicious login:', error);
    return { isSuspicious: false, reasons: [] };
  }
}
