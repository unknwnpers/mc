import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, isBlocked } from "./rate-limiter";
import { logSecurityEvent } from "./logger";

interface RateLimitConfig {
  enabled: boolean;
  limit: number;
  window: number;
}

const defaultConfig: RateLimitConfig = {
  enabled: true,
  limit: 20,
  window: 60,
};

/**
 * Security middleware for API routes
 * - Rate limiting
 * - Block detection
 * - Request logging
 */
export async function withSecurityMiddleware(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<NextResponse | null> {
  const finalConfig = { ...defaultConfig, ...config };
  
  // Get client info
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const path = request.nextUrl.pathname;
  
  // Check if blocked
  const blocked = await isBlocked(ip);
  if (blocked) {
    await logSecurityEvent({
      type: "SECURITY",
      action: "BLOCKED_REQUEST",
      ip,
      userAgent,
      status: "FAILED",
      metadata: { path },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }
  
  // Apply rate limiting if enabled
  if (finalConfig.enabled) {
    const result = await rateLimit(ip, finalConfig.limit, finalConfig.window);
    
    if (!result.success) {
      await logSecurityEvent({
        type: "SECURITY",
        action: "RATE_LIMIT_EXCEEDED",
        ip,
        userAgent,
        status: "FAILED",
        metadata: { 
          path,
          remaining: result.remaining,
          resetAt: result.resetAt,
        },
        timestamp: new Date(),
      });
      
      return NextResponse.json(
        { error: "Too many requests", retryAfter: result.resetAt },
        { status: 429 }
      );
    }
  }
  
  // Continue to next handler
  return null;
}

/**
 * Simplified wrapper for admin routes
 */
export async function protectAdminRoute(request: NextRequest): Promise<NextResponse | null> {
  return withSecurityMiddleware(request, {
    limit: 10, // Stricter limit for admin
    window: 60,
  });
}
