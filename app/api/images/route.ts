import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Redis } from '@upstash/redis';

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const CACHE_TTL = 600; // 10 minutes cache

export const dynamic = 'force-dynamic';

/**
 * GET /api/images
 * List all public images with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Create cache key
    const cacheKey = `images:list:${category || 'all'}:${subcategory || 'all'}:${limit}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(
          {
            success: true,
            images: cached,
            cached: true,
          },
          {
            headers: {
              'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
            },
          }
        );
      }
    } catch (cacheErr) {
      console.warn('[Images API] Cache error:', cacheErr);
    }

    // Build query
    let query: any = adminDb
      .collection('image_metadata')
      .where('isActive', '==', true)
      .orderBy('uploadedAt', 'desc')
      .limit(limit);

    // Apply category filter
    if (category) {
      query = query.where('category', '==', category);
    }

    // Apply subcategory filter
    if (subcategory) {
      query = query.where('subcategory', '==', subcategory);
    }

    const snapshot = await query.get();

    const images = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        fileName: data.fileName,
        originalName: data.originalName,
        category: data.category,
        subcategory: data.subcategory,
        contentType: data.contentType,
        size: data.size,
        variants: data.variants,
        url: data.variants?.original?.url || '',
        uploadedAt: data.uploadedAt?.toDate?.().toISOString() || data.uploadedAt,
        isActive: data.isActive,
      };
    });

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, images);
    } catch (cacheErr) {
      console.warn('[Images API] Cache set error:', cacheErr);
    }

    return NextResponse.json(
      {
        success: true,
        images,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error: any) {
    console.error('[Images API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch images',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
