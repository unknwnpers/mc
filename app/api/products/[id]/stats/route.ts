export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const VIEWER_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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

    const now = Date.now();
    const cutoffTime = now - VIEWER_WINDOW_MS;

    // 1. Get active viewers count (views in last 5 minutes)
    const viewsSnapshot = await adminDb
      .collection('product_views')
      .where('productId', '==', id)
      .where('viewedAt', '>=', cutoffTime)
      .count()
      .get();
    
    const viewers = viewsSnapshot.data().count;

    // 2. Get in-cart count
    // This requires querying all user cart subcollections
    // For performance, we'll use a cart_items collection group query
    // or query the reservations collection for pending items
    let inCart = 0;
    try {
      const reservationsSnapshot = await adminDb
        .collection('reservations')
        .where('status', '==', 'reserved')
        .where('items', 'array-contains-any', [{ productId: id }])
        .get();
      
      // Count unique users with this product in their reservation
      const uniqueUsers = new Set();
      reservationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const hasProduct = data.items?.some((item: any) => item.productId === id);
        if (hasProduct && data.userId) {
          uniqueUsers.add(data.userId);
        }
      });
      inCart = uniqueUsers.size;
    } catch (cartErr) {
      console.warn('[Product Stats API] Cart count error:', cartErr);
      // Fallback: don't break the API if cart counting fails
    }

    // 3. Get available stock per variant
    const productDoc = await adminDb.collection('products').doc(id).get();
    const availableStock: Record<string, number> = {};
    
    if (productDoc.exists) {
      const data = productDoc.data();
      const variants = data?.variants || [];
      
      variants.forEach((variant: any) => {
        const sku = variant.sku;
        const stock = variant.stock || 0;
        const reserved = variant.reservedStock || 0;
        availableStock[sku] = Math.max(0, stock - reserved);
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        viewers,
        inCart,
        availableStock,
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    });

  } catch (error: any) {
    console.error('[Product Stats API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product stats',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
