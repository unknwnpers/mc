import { Redis } from "@upstash/redis";
import { getSecurityPolicies } from "./security-policies";

// Initialize Upstash Redis only if credentials are available
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

const redis = redisUrl && redisToken 
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

if (!redis) {
  console.warn("[Rate Limiter] Redis not configured - rate limiting disabled");
}

// Cache for policies to avoid repeated Firestore calls
let policiesCache: { policies: Awaited<ReturnType<typeof getSecurityPolicies>>; timestamp: number } | null = null;
const POLICIES_CACHE_TTL = 30000; // 30 seconds

/**
 * Get security policies with caching
 */
async function getCachedPolicies() {
  const now = Date.now();
  if (policiesCache && (now - policiesCache.timestamp) < POLICIES_CACHE_TTL) {
    return policiesCache.policies;
  }
  
  const policies = await getSecurityPolicies();
  policiesCache = { policies, timestamp: now };
  return policies;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Global rate limiter using Redis (works on Vercel serverless)
 * Uses security policies for configuration
 * @param identifier - Usually IP address or user ID
 * @param limit - Max requests per window (overrides policy if provided)
 * @param windowInSeconds - Time window (overrides policy if provided)
 */
export async function rateLimit(
  identifier: string,
  limit?: number,
  windowInSeconds?: number
): Promise<RateLimitResult> {
  // Get policies for configuration
  const policies = await getCachedPolicies();
  
  // Use provided values or fall back to policies
  const effectiveLimit = limit ?? policies.rateLimitRequests;
  const effectiveWindow = windowInSeconds ?? policies.rateLimitWindow;
  
  // If rate limiting is disabled, allow all requests
  if (!policies.rateLimitEnabled) {
    return {
      success: true,
      remaining: effectiveLimit,
      resetAt: Date.now() + effectiveWindow * 1000,
    };
  }
  
  // If Redis not configured, allow all requests
  if (!redis) {
    return {
      success: true,
      remaining: effectiveLimit,
      resetAt: Date.now() + effectiveWindow * 1000,
    };
  }
  
  const key = `rate:${identifier}`;
  
  try {
    // Increment counter
    const count = await redis.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, effectiveWindow);
    }
    
    const remaining = Math.max(0, effectiveLimit - count);
    const resetAt = Date.now() + effectiveWindow * 1000;
    
    return {
      success: count <= effectiveLimit,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail open - allow request but log warning
    return {
      success: true,
      remaining: 0,
      resetAt: Date.now(),
    };
  }
}

/**
 * Check if IP is blocked
 */
export async function isBlocked(identifier: string): Promise<boolean> {
  // If Redis not configured, nothing is blocked
  if (!redis) {
    return false;
  }
  
  try {
    const blocked = await redis.get(`blocked:${identifier}`);
    return !!blocked;
  } catch (error) {
    console.error("Block check error:", error);
    return false;
  }
}

/**
 * Block an identifier for specified duration
 */
export async function blockIdentifier(
  identifier: string,
  durationSeconds: number = 3600,
  reason?: string
): Promise<void> {
  // If Redis not configured, silently skip
  if (!redis) {
    console.warn(`[Rate Limiter] Cannot block ${identifier} - Redis not configured`);
    return;
  }
  
  try {
    await redis.set(`blocked:${identifier}`, "true", {
      ex: durationSeconds,
    });
    
    // Log the block
    await redis.lpush("blocks", JSON.stringify({
      identifier,
      reason,
      timestamp: Date.now(),
      duration: durationSeconds,
    }));
    
    // Keep only last 100 blocks
    await redis.ltrim("blocks", 0, 99);
    
    console.log(`🚫 Blocked ${identifier} for ${durationSeconds}s - Reason: ${reason}`);
  } catch (error) {
    console.error("Block error:", error);
  }
}

/**
 * Track failed login attempts
 * Uses security policies for configuration
 */
export async function trackFailedAttempt(
  identifier: string,
  maxAttempts?: number,
  windowMinutes?: number
): Promise<{ blocked: boolean; attempts: number }> {
  // Get policies for configuration
  const policies = await getCachedPolicies();
  
  // Use provided values or fall back to policies
  const effectiveMaxAttempts = maxAttempts ?? policies.maxFailedAttempts;
  const effectiveWindowMinutes = windowMinutes ?? policies.failedAttemptsWindow;
  
  // If auto-block is disabled, just track but don't block
  const autoBlockEnabled = policies.autoBlockEnabled;
  
  // If Redis not configured, silently skip tracking
  if (!redis) {
    return { blocked: false, attempts: 0 };
  }
  
  const key = `failed:${identifier}`;
  
  try {
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      await redis.expire(key, effectiveWindowMinutes * 60);
    }
    
    // Auto-block if too many failures and auto-block is enabled
    if (autoBlockEnabled && attempts > effectiveMaxAttempts) {
      await blockIdentifier(
        identifier,
        policies.blockDuration * 60, // Convert minutes to seconds
        `Too many failed attempts: ${attempts} in ${effectiveWindowMinutes}m`
      );
      return { blocked: true, attempts };
    }
    
    return { blocked: false, attempts };
  } catch (error) {
    console.error("Failed attempt tracking error:", error);
    return { blocked: false, attempts: 0 };
  }
}

/**
 * Reset failed attempts counter
 */
export async function resetFailedAttempts(identifier: string): Promise<void> {
  // If Redis not configured, silently skip
  if (!redis) {
    return;
  }
  
  try {
    await redis.del(`failed:${identifier}`);
  } catch (error) {
    console.error("Reset error:", error);
  }
}
