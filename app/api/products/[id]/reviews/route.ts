import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Redis } from '@upstash/redis';

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const CACHE_TTL = 300; // 5 minutes cache for reviews

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    // Create cache key
    const cacheKey = `products:reviews:${id}`;
    
    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          ...cached,
          cached: true,
        });
      }
    } catch (cacheErr) {
      console.warn('[Product Reviews API] Cache error:', cacheErr);
    }
    
    // Fetch reviews from Firestore
    const reviewsRef = adminDb.collection('reviews');
    const snapshot = await reviewsRef
      .where('productId', '==', id)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .get();
    
    interface Review {
      id: string;
      productId: string;
      userId: string;
      userName: string;
      rating: number;
      title?: string;
      comment: string;
      status: string;
      createdAt: string;
      updatedAt?: string;
      [key: string]: any;
    }

    const reviews: Review[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
      } as Review;
    });
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    // Calculate rating distribution
    const distribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };
    
    const result = {
      reviews,
      total: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      distribution,
    };
    
    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, result);
    } catch (cacheErr) {
      console.warn('[Product Reviews API] Cache set error:', cacheErr);
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      cached: false,
    });
    
  } catch (error: any) {
    console.error('[Product Reviews API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reviews',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
