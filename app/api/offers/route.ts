/**
 * Public Offers API
 * Get active offers for frontend display
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export interface AppliedOffer {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  displayText: string;
  originalPrice: number;
  discountedPrice: number;
  savings: number;
}

// GET /api/offers - Get active offers (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const productId = searchParams.get('productId');
    
    // Get all active offers
    const offersSnapshot = await adminDb
      .collection('offers')
      .where('isActive', '==', true)
      .get();
    
    const now = new Date();
    
    const offers = offersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((offer: any) => {
        // Check date range
        if (offer.startDate && offer.startDate.toDate() > now) return false;
        if (offer.endDate && offer.endDate.toDate() < now) return false;
        
        // Filter by applicability
        if (categorySlug && offer.appliesTo === 'category') {
          return offer.categorySlug === categorySlug;
        }
        if (productId && offer.appliesTo === 'product') {
          return offer.productIds?.includes(productId);
        }
        if (offer.appliesTo === 'all') {
          return true;
        }
        
        // If no filters specified, return all valid offers
        return true;
      });
    
    return NextResponse.json({ 
      success: true, 
      offers,
      count: offers.length
    });
    
  } catch (error: any) {
    console.error('Fetch offers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// POST /api/offers/calculate - Calculate discount for a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { price, categorySlug, productId } = body;
    
    if (price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Price is required' },
        { status: 400 }
      );
    }
    
    // Get applicable offers
    const offersSnapshot = await adminDb
      .collection('offers')
      .where('isActive', '==', true)
      .get();
    
    const now = new Date();
    
    const applicableOffers = offersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((offer: any) => {
        if (offer.startDate && offer.startDate.toDate() > now) return false;
        if (offer.endDate && offer.endDate.toDate() < now) return false;
        
        if (offer.appliesTo === 'all') return true;
        if (offer.appliesTo === 'category' && offer.categorySlug === categorySlug) return true;
        if (offer.appliesTo === 'product' && offer.productIds?.includes(productId)) return true;
        
        return false;
      })
      .sort((a: any, b: any) => {
        // Sort by best discount (highest savings first)
        const savingsA = a.type === 'percentage' ? price * (a.value / 100) : a.value;
        const savingsB = b.type === 'percentage' ? price * (b.value / 100) : b.value;
        return savingsB - savingsA;
      });
    
    // Apply best offer
    const bestOffer = applicableOffers[0] as any;
    
    if (!bestOffer) {
      return NextResponse.json({
        success: true,
        hasOffer: false,
        originalPrice: price,
        discountedPrice: price,
        savings: 0
      });
    }
    
    const savings = bestOffer.type === 'percentage' 
      ? Math.round(price * (bestOffer.value / 100))
      : bestOffer.value;
    
    const discountedPrice = Math.max(0, price - savings);
    
    return NextResponse.json({
      success: true,
      hasOffer: true,
      offer: {
        id: bestOffer.id,
        name: bestOffer.name,
        type: bestOffer.type,
        value: bestOffer.value,
        displayText: bestOffer.displayText
      },
      originalPrice: price,
      discountedPrice,
      savings
    });
    
  } catch (error: any) {
    console.error('Calculate offer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to calculate offer' },
      { status: 500 }
    );
  }
}
