# 🔐 ENTERPRISE SECURITY IMPLEMENTATION GUIDE

## 🎯 Overview

This document provides a complete blueprint for production-grade security including **detection, response, and containment** capabilities.

---

## 📚 Architecture

```
User → Edge (Cloudflare) → API → Auth Verify → Rate Limit → Policy Engine → DB
                             ↓                       ↓
                       Audit Logs            Detection Engine
                             ↓                       ↓
                       Security Dashboard    Auto Response
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install @upstash/redis
```

---

### Step 2: Set Up Redis (Upstash)

1. Create account at https://upstash.com
2. Create new Redis database
3. Copy credentials to `.env.local`:

```env
UPSTASH_REDIS_URL=https://your-db.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here
```

---

### Step 3: Environment Variables Required

Add these to Vercel → Settings → Environment Variables:

| Variable | Scope | Description |
|----------|-------|-------------|
| `UPSTASH_REDIS_URL` | All | Upstash Redis URL |
| `UPSTASH_REDIS_TOKEN` | All | Upstash auth token |
| `FIREBASE_PROJECT_ID` | All | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | All | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | All | Firebase service account private key |

---

## 🔧 Core Components

### 1. Security Logger (`lib/logger.ts`)

**Purpose:** Centralized audit trail for all critical events

**Usage Example:**

```typescript
import { logSecurityEvent } from "@/lib/logger";

// Log admin action
await logSecurityEvent({
  type: "ADMIN_ACTION",
  action: "DELETE_PRODUCT",
  userId: user.uid,
  role: "admin",
  ip: clientIp,
  status: "SUCCESS",
  metadata: {
    productId: "abc123",
    productName: "Test Product",
  },
  timestamp: new Date(),
});

// Log failed login
await logSecurityEvent({
  type: "AUTH",
  action: "LOGIN_ATTEMPT",
  userId: email,
  ip: clientIp,
  status: "FAILED",
  metadata: { reason: "Invalid password" },
  timestamp: new Date(),
});
```

---

### 2. Rate Limiter (`lib/rate-limiter.ts`)

**Purpose:** Global rate limiting using Redis (works on serverless)

**Available Functions:**

```typescript
// Basic rate limiting
const result = await rateLimit(ip, limit: 20, window: 60);
if (!result.success) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

// Check if blocked
const isBlockedResult = await isBlocked(ip);
if (isBlockedResult) {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

// Block an IP
await blockIdentifier(ip, durationSeconds: 3600, reason: "Too many failures");

// Track failed logins (auto-blocks after 5 attempts)
const { blocked, attempts } = await trackFailedAttempt(ip, maxAttempts: 5);
```

---

### 3. Security Middleware (`lib/security-middleware.ts`)

**Purpose:** Drop-in middleware for API routes

**Usage:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { protectAdminRoute } from "@/lib/security-middleware";

export async function GET(request: NextRequest) {
  // Apply security middleware
  const securityResponse = await protectAdminRoute(request);
  if (securityResponse) {
    return securityResponse; // Blocked or rate limited
  }
  
  // Continue with normal logic
  return NextResponse.json({ data: "success" });
}
```

---

## 📊 Firestore Collections Created

### `security_logs`

Stores all security-relevant events:

```typescript
{
  type: "SECURITY" | "ADMIN_ACTION" | "AUTH",
  action: "LOGIN_ATTEMPT" | "DELETE_PRODUCT" | "BLOCKED_REQUEST",
  userId?: string,
  role?: string,
  ip?: string,
  userAgent?: string,
  status: "SUCCESS" | "FAILED",
  metadata?: object,
  timestamp: Timestamp
}
```

### `admin_logs`

Backward-compatible admin action logging:

```typescript
{
  adminId: string,
  action: string,
  resourceId?: string,
  details: string, // JSON stringified
  status: "SUCCESS" | "FAILED",
  ip?: string,
  createdAt: Timestamp
}
```

### `blocked_ips` (Redis)

Temporary block list with TTL

### `rate:*` (Redis)

Rate limit counters with auto-expiry

---

## 🛡️ Implementation Examples

### Example 1: Protect Login Route

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { trackFailedAttempt, resetFailedAttempts } from "@/lib/rate-limiter";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const { ip, userAgent } = getClientInfo(request);
  
  try {
    // Sign in user
    const user = await getAuth().getUserByEmail(email);
    
    // Success - reset failed counter
    await resetFailedAttempts(ip);
    
    await logSecurityEvent({
      type: "AUTH",
      action: "LOGIN_SUCCESS",
      userId: user.uid,
      ip,
      userAgent,
      status: "SUCCESS",
      timestamp: new Date(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Failed login - track and potentially block
    const { blocked, attempts } = await trackFailedAttempt(ip);
    
    await logSecurityEvent({
      type: "AUTH",
      action: "LOGIN_FAILED",
      userId: email,
      ip,
      userAgent,
      status: "FAILED",
      metadata: { attempts, blocked, error: error.message },
      timestamp: new Date(),
    });
    
    if (blocked) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    );
  }
}
```

---

### Example 2: Protect Admin Delete

```typescript
// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { protectAdminRoute } from "@/lib/security-middleware";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

export async function DELETE(request: NextRequest) {
  // Apply security middleware first
  const securityResponse = await protectAdminRoute(request);
  if (securityResponse) {
    return securityResponse;
  }
  
  try {
    const user = await verifyAdmin(request);
    const { id, action } = await request.json();
    const { ip, userAgent } = getClientInfo(request);
    
    // Perform delete logic here...
    
    // Log the action
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: action === "delete_permanently" ? "PERMANENT_DELETE" : "ARCHIVE",
      userId: user.uid,
      role: user.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: { productId: id },
      timestamp: new Date(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "DELETE_FAILED",
      userId: user?.uid,
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status || 500 }
    );
  }
}
```

---

## 🚨 Detection Rules (Coming Soon)

### Rule 1: Too Many Failed Logins
- **Trigger:** >5 failed attempts in 5 minutes
- **Action:** Auto-block IP for 1 hour
- **Alert:** Log to security dashboard

### Rule 2: Unusual Admin Activity
- **Trigger:** >10 deletes in 1 minute by single admin
- **Action:** Flag account for review
- **Alert:** Notify superadmin

### Rule 3: Geographic Anomaly
- **Trigger:** Login from different country within 2 hours
- **Action:** Force re-authentication
- **Alert:** Security notification email

---

## 📈 Security Dashboard (Coming Soon)

The `/admin/security` page will display:

- Recent login attempts (success/fail)
- Blocked IPs
- Admin actions timeline
- Suspicious activity alerts
- Rate limit violations

---

## ⚠️ Important Notes

1. **Redis is required** - The system uses Upstash Redis for global state
2. **Logs are append-only** - Never delete security logs
3. **Blocks are temporary** - Default 1 hour, configurable
4. **Fail open** - If Redis fails, requests still go through (logged)
5. **Privacy compliance** - Ensure GDPR/CCPA compliance for IP storage

---

## 🔍 Monitoring & Alerts

### Daily Checks

- Review `security_logs` for anomalies
- Check blocked IPs list
- Monitor rate limit violations

### Weekly Reviews

- Analyze login failure patterns
- Review admin action distribution
- Update detection rules as needed

---

## 📋 Deployment Checklist

- [ ] Create Upstash Redis account
- [ ] Add `UPSTASH_REDIS_URL` to Vercel
- [ ] Add `UPSTASH_REDIS_TOKEN` to Vercel
- [ ] Install `@upstash/redis` package
- [ ] Deploy updated code
- [ ] Test rate limiting works
- [ ] Verify security logs are created
- [ ] Set up monitoring schedule

---

## 🎯 Next Steps

After implementing this foundation:

1. Build security dashboard UI
2. Implement detection rules engine
3. Add Slack/email alert integration
4. Create session tracking system
5. Add Cloudflare Bot Fight mode
6. Implement request fingerprinting

---

**Status:** ✅ Core infrastructure ready  
**Next Phase:** Detection engine + dashboard
