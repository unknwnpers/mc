import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Redis } from '@upstash/redis';
import type { Product } from '@/lib/types';

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const CACHE_TTL = 600; // 10 minutes cache for single product

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
    const cacheKey = `products:detail:${id}`;
    
    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          product: cached,
          cached: true,
        }, {
          headers: {
            'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
          }
        });
      }
    } catch (cacheErr) {
      console.warn('[Product Detail API] Cache error:', cacheErr);
    }
    
    // Fetch product from Firestore
    const docRef = adminDb.collection('products').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    const data = docSnap.data();
    
    // Check if product is active
    if (data?.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Product is not available' },
        { status: 404 }
      );
    }
    
    // Calculate available stock for each variant
    const variants = data?.variants || [];
    const variantsWithAvailableStock = variants.map((variant: any) => ({
      ...variant,
      availableStock: Math.max(0, (variant.stock || 0) - (variant.reservedStock || 0)),
    }));

    const product: Product = {
      id: docSnap.id,
      ...data,
      variants: variantsWithAvailableStock,
      // Convert Firestore timestamps to ISO strings
      createdAt: data?.createdAt?.toDate?.().toISOString() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.().toISOString() || data?.updatedAt,
    } as Product;
    
    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, product);
    } catch (cacheErr) {
      console.warn('[Product Detail API] Cache set error:', cacheErr);
    }
    
    return NextResponse.json({
      success: true,
      product,
      cached: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
      }
    });
    
  } catch (error: any) {
    console.error('[Product Detail API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
