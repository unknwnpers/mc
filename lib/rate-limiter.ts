import { Redis } from "@upstash/redis";

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Global rate limiter using Redis (works on Vercel serverless)
 * @param identifier - Usually IP address or user ID
 * @param limit - Max requests per window
 * @param windowInSeconds - Time window (default: 60s)
 */
export async function rateLimit(
  identifier: string,
  limit: number = 20,
  windowInSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `rate:${identifier}`;
  
  try {
    // Increment counter
    const count = await redis.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, windowInSeconds);
    }
    
    const remaining = Math.max(0, limit - count);
    const resetAt = Date.now() + windowInSeconds * 1000;
    
    return {
      success: count <= limit,
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
 */
export async function trackFailedAttempt(
  identifier: string,
  maxAttempts: number = 5,
  windowMinutes: number = 5
): Promise<{ blocked: boolean; attempts: number }> {
  const key = `failed:${identifier}`;
  const windowMs = windowMinutes * 60 * 1000;
  
  try {
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      await redis.expire(key, windowMinutes * 60);
    }
    
    // Auto-block if too many failures
    if (attempts > maxAttempts) {
      await blockIdentifier(
        identifier,
        60 * 60, // 1 hour
        `Too many failed attempts: ${attempts} in ${windowMinutes}m`
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
  try {
    await redis.del(`failed:${identifier}`);
  } catch (error) {
    console.error("Reset error:", error);
  }
}
