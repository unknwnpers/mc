import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Redis } from '@upstash/redis';

// Initialize Redis for caching + rate limiting (only if credentials available)
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const CACHE_TTL = 600; // 10 minutes cache
const MAX_LIMIT = 100;
const RATE_LIMIT = 100; // requests per minute

export const dynamic = 'force-dynamic';

/**
 * GET /api/images
 * List all public images with optional filtering
 * Production-grade: indexed queries, pagination, rate limiting, caching
 */
export async function GET(request: NextRequest) {
  try {
    // ─── Rate Limiting ─────────────────────────────────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const rateKey = `rate:images:${ip}`;
    
    if (redis) {
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 60);
      
      if (count > RATE_LIMIT) {
        return NextResponse.json(
          { success: false, error: 'Too many requests' },
          { status: 429 }
        );
      }
    }

    // ─── Parse & Validate Params ───────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const cursor = searchParams.get('cursor');
    const isAdminRequest = request.headers.get('x-admin') === 'true';
    
    // Strict limit validation
    const limitRaw = parseInt(searchParams.get('limit') || '50');
    const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);

    // Validate: if category provided, subcategory is required (for indexed query)
    if (category && !subcategory) {
      return NextResponse.json(
        { success: false, error: 'subcategory required when category is provided' },
        { status: 400 }
      );
    }

    // ─── Cache Check (skip for admin) ──────────────────────────────────────
    const cacheKey = `images:list:${category || 'all'}:${subcategory || 'all'}:${limit}:${cursor || 'start'}`;
    
    if (!isAdminRequest && redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return NextResponse.json(
            { ...cached, cached: true },
            { headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200' } }
          );
        }
      } catch (cacheErr) {
        console.warn('[Images API] Cache error:', cacheErr);
      }
    }

    // ─── Build Query (single composite index strategy) ─────────────────────
    let query: any;
    
    if (category && subcategory) {
      // Use composite key for efficient filtering
      const categoryKey = `${category}_${subcategory}`;
      query = adminDb
        .collection('image_metadata')
        .where('isActive', '==', true)
        .where('categoryKey', '==', categoryKey)
        .orderBy('uploadedAt', 'desc');
    } else {
      // Base query (no category filter)
      query = adminDb
        .collection('image_metadata')
        .where('isActive', '==', true)
        .orderBy('uploadedAt', 'desc');
    }

    // Apply cursor pagination
    if (cursor) {
      const cursorDoc = await adminDb.collection('image_metadata').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Apply limit
    query = query.limit(limit + 1); // +1 to check for next page

    // Execute query
    const snapshot = await query.get();
    const docs = snapshot.docs;
    
    // Check if there's a next page
    const hasMore = docs.length > limit;
    const results = hasMore ? docs.slice(0, limit) : docs;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    // ─── Format Response ───────────────────────────────────────────────────
    const images = results.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        fileName: data.fileName,
        originalName: data.originalName,
        category: data.category,
        subcategory: data.subcategory,
        categoryKey: data.categoryKey,
        contentType: data.contentType,
        size: data.size,
        variants: data.variants,
        url: data.variants?.original?.url ?? null,
        uploadedAt: data.uploadedAt?.toDate?.().toISOString() || data.uploadedAt,
        isActive: data.isActive,
      };
    });

    const response = {
      success: true,
      images,
      pagination: {
        limit,
        nextCursor,
        hasMore,
      },
      cached: false,
    };

    // ─── Cache Result (skip for admin) ─────────────────────────────────────
    if (!isAdminRequest && redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, response);
      } catch (cacheErr) {
        console.warn('[Images API] Cache set error:', cacheErr);
      }
    }

    return NextResponse.json(
      response,
      { headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200' } }
    );

  } catch (error: any) {
    console.error('[Images API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch images',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
