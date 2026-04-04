/**
 * Admin Offers API
 * Manage promotional offers and discounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/rbac';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

export interface Offer {
  id?: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number; // percentage (20 = 20%) or fixed amount
  isActive: boolean;
  appliesTo: 'all' | 'category' | 'product';
  categorySlug?: string;
  productIds?: string[];
  startDate?: Date;
  endDate?: Date;
  displayText: string; // e.g., "SAVE 20%"
  createdAt?: any;
  updatedAt?: any;
}

// GET /api/admin/offers - List all offers
export async function GET(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    
    const offersSnapshot = await adminDb
      .collection('offers')
      .orderBy('createdAt', 'desc')
      .get();
    
    const offers = offersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Offer[];
    
    return NextResponse.json({ success: true, offers });
    
  } catch (error: any) {
    console.error('List offers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch offers' },
      { status: error.status || 500 }
    );
  }
}

// POST /api/admin/offers - Create new offer
export async function POST(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const body = await request.json();
    const { name, type, value, isActive, appliesTo, categorySlug, productIds, startDate, endDate, displayText } = body;
    
    // Validation
    if (!name || !type || value === undefined || !appliesTo || !displayText) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (type !== 'percentage' && type !== 'fixed') {
      return NextResponse.json(
        { success: false, error: 'Invalid offer type' },
        { status: 400 }
      );
    }
    
    if (appliesTo === 'category' && !categorySlug) {
      return NextResponse.json(
        { success: false, error: 'Category slug required for category offers' },
        { status: 400 }
      );
    }
    
    const offerData: Omit<Offer, 'id'> = {
      name,
      type,
      value,
      isActive: isActive ?? true,
      appliesTo,
      ...(categorySlug && { categorySlug }),
      ...(productIds && { productIds }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      displayText,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    const docRef = await adminDb.collection('offers').add(offerData);
    
    // Log security event
    await logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'CREATE_OFFER',
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { offerId: docRef.id, offerName: name },
      timestamp: new Date()
    });
    
    return NextResponse.json({ 
      success: true, 
      offer: { id: docRef.id, ...offerData }
    });
    
  } catch (error: any) {
    console.error('Create offer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create offer' },
      { status: error.status || 500 }
    );
  }
}
