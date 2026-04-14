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
 * GET /api/images/[id]
 * Get a specific image by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Get variant from query params (original, thumbnail, medium)
    const { searchParams } = new URL(request.url);
    const variant = (searchParams.get('variant') as 'original' | 'thumbnail' | 'medium') || 'original';

    // Create cache key
    const cacheKey = `images:detail:${id}:${variant}`;

    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(
          {
            success: true,
            image: cached,
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
      console.warn('[Image Detail API] Cache error:', cacheErr);
    }

    // Fetch from Firestore
    const docRef = adminDb.collection('image_metadata').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    const data = docSnap.data();

    // Check if image is active
    if (data?.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Image is not available' },
        { status: 404 }
      );
    }

    // Get URL for requested variant
    const variantData = data?.variants?.[variant];
    const url = variantData?.url || data?.variants?.original?.url || '';

    const image = {
      id: docSnap.id,
      fileName: data?.fileName,
      originalName: data?.originalName,
      category: data?.category,
      subcategory: data?.subcategory,
      contentType: data?.contentType,
      size: data?.size,
      variants: data?.variants,
      url,
      variant,
      width: variantData?.width || data?.variants?.original?.width,
      height: variantData?.height || data?.variants?.original?.height,
      uploadedAt: data?.uploadedAt?.toDate?.().toISOString() || data?.uploadedAt,
      isActive: data?.isActive,
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, image);
    } catch (cacheErr) {
      console.warn('[Image Detail API] Cache set error:', cacheErr);
    }

    return NextResponse.json(
      {
        success: true,
        image,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
        },
      }
    );
  } catch (error: any) {
    console.error('[Image Detail API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/images/[id]
 * Delete an image (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // Import verifyAdmin dynamically to avoid issues
    const { verifyAdmin } = await import('@/lib/rbac');
    const admin = await verifyAdmin(request);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get image metadata
    const docRef = adminDb.collection('image_metadata').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    const data = docSnap.data();
    const { adminStorage } = await import('@/lib/firebase-admin');
    const bucket = adminStorage.bucket();

    // Delete all variants from storage
    const variants = data?.variants || {};
    for (const [variantName, variantData] of Object.entries(variants)) {
      const path = (variantData as any)?.path;
      if (path) {
        try {
          await bucket.file(path).delete();
        } catch (err) {
          console.warn(`[Image Delete] Failed to delete variant ${variantName}:`, err);
        }
      }
    }

    // Delete metadata from Firestore
    await docRef.delete();

    // Clear cache
    try {
      await redis.del(`images:detail:${id}:original`);
      await redis.del(`images:detail:${id}:thumbnail`);
      await redis.del(`images:detail:${id}:medium`);
    } catch (cacheErr) {
      console.warn('[Image Delete] Cache clear error:', cacheErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('[Image Delete API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
