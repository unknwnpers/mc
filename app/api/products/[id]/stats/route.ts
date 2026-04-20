export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const VIEWER_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup old view records for a product (fire-and-forget)
async function cleanupOldViews(productId: string, cutoffTime: number): Promise<void> {
  try {
    const oldViewsSnapshot = await adminDb
      .collection('product_views')
      .where('productId', '==', productId)
      .where('viewedAt', '<', cutoffTime)
      .limit(100)
      .get();
    
    if (oldViewsSnapshot.empty) return;
    
    const batch = adminDb.batch();
    oldViewsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`[Product Stats] Cleaned up ${oldViewsSnapshot.size} old views for ${productId}`);
  } catch (error) {
    console.error('[Product Stats] Cleanup error:', error);
  }
}

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
    // Note: viewedAt is stored as timestamp (number), query as number
    const viewsSnapshot = await adminDb
      .collection('product_views')
      .where('productId', '==', id)
      .where('viewedAt', '>=', cutoffTime)
      .count()
      .get();
    
    const viewers = viewsSnapshot.data().count;

    // Cleanup old views (fire-and-forget)
    cleanupOldViews(id, cutoffTime).catch(console.error);

    // 2. Get in-cart count
    // Query all reservations with 'reserved' status and count those containing this product
    let inCart = 0;
    try {
      const reservationsSnapshot = await adminDb
        .collection('reservations')
        .where('status', '==', 'reserved')
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
