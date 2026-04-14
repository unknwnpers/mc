import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Redis } from '@upstash/redis';
import type { Product } from '@/lib/types';

// Initialize Redis for caching
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const CACHE_TTL = 300; // 5 minutes cache for product listings

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'latest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const featured = searchParams.get('featured') === 'true';
    const isNew = searchParams.get('new') === 'true';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null;
    const sizes = searchParams.get('sizes')?.split(',').filter(Boolean) || [];
    
    // Create cache key based on query params
    const cacheKey = `products:list:${category || 'all'}:${search || 'none'}:${sort}:${page}:${limit}:${featured}:${isNew}:${minPrice}:${maxPrice}:${sizes.join(',')}`;
    
    // Try to get from cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          products: cached,
          cached: true,
        }, {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          }
        });
      }
    } catch (cacheErr) {
      console.warn('[Products API] Cache error:', cacheErr);
    }
    
    // Build Firestore query
    let firestoreQuery: FirebaseFirestore.Query = adminDb.collection('products');
    
    // Apply base filter - only active products
    firestoreQuery = firestoreQuery.where('isActive', '==', true);
    
    // Apply sorting
    if (sort === 'latest') {
      firestoreQuery = firestoreQuery.orderBy('createdAt', 'desc');
    } else if (sort === 'price_low' || sort === 'price_high') {
      // We'll sort by price in-memory since price is in variants
      firestoreQuery = firestoreQuery.orderBy('createdAt', 'desc');
    }
    
    // Execute query
    const snapshot = await firestoreQuery.get();
    
    let products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt,
      };
    }) as Product[];
    
    // Apply in-memory filters
    
    // Category filter
    if (category) {
      products = products.filter(p => p.category_slug === category);
    }
    
    // Featured filter
    if (featured) {
      products = products.filter(p => p.is_featured === true);
    }
    
    // New arrivals filter (last 30 days)
    if (isNew) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      products = products.filter(p => {
        const createdAt = p.createdAt ? new Date(p.createdAt) : null;
        return createdAt && createdAt >= thirtyDaysAgo;
      });
    }
    
    // Price range filter
    if (minPrice !== null || maxPrice !== null) {
      products = products.filter(p => {
        const price = p.variants?.[0]?.price || 0;
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }
    
    // Size filter
    if (sizes.length > 0) {
      products = products.filter(p => 
        p.variants?.some((v: any) => sizes.includes(v.options?.Size || ''))
      );
    }
    
    // Search filter
    if (search) {
      const term = search.toLowerCase();
      products = products.filter(p => 
        p.name?.toLowerCase().includes(term) || 
        p.description?.toLowerCase().includes(term)
      );
    }
    
    // Price sorting (in-memory)
    if (sort === 'price_low') {
      products.sort((a, b) => {
        const priceA = a.variants?.[0]?.price || 0;
        const priceB = b.variants?.[0]?.price || 0;
        return priceA - priceB;
      });
    } else if (sort === 'price_high') {
      products.sort((a, b) => {
        const priceA = a.variants?.[0]?.price || 0;
        const priceB = b.variants?.[0]?.price || 0;
        return priceB - priceA;
      });
    }
    
    // Calculate total before pagination
    const total = products.length;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    const result = {
      products: paginatedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: endIndex < total,
    };
    
    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_TTL, result);
    } catch (cacheErr) {
      console.warn('[Products API] Cache set error:', cacheErr);
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      cached: false,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      }
    });
    
  } catch (error: any) {
    console.error('[Products API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch products',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
