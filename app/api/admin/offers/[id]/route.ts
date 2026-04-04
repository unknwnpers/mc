/**
 * Individual Offer API
 * Update and delete specific offers
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/rbac';
import { logSecurityEvent, getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

// PUT /api/admin/offers/[id] - Update offer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    const { id } = params;
    
    const body = await request.json();
    const { name, type, value, isActive, appliesTo, categorySlug, productIds, startDate, endDate, displayText } = body;
    
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };
    
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = value;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (appliesTo !== undefined) updateData.appliesTo = appliesTo;
    if (categorySlug !== undefined) updateData.categorySlug = categorySlug;
    if (productIds !== undefined) updateData.productIds = productIds;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (displayText !== undefined) updateData.displayText = displayText;
    
    await adminDb.collection('offers').doc(id).update(updateData);
    
    // Log security event
    await logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'UPDATE_OFFER',
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { offerId: id, updates: Object.keys(updateData) },
      timestamp: new Date()
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Update offer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update offer' },
      { status: error.status || 500 }
    );
  }
}

// DELETE /api/admin/offers/[id] - Delete offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    const { id } = params;
    
    await adminDb.collection('offers').doc(id).delete();
    
    // Log security event
    await logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'DELETE_OFFER',
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: 'SUCCESS',
      metadata: { offerId: id },
      timestamp: new Date()
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Delete offer error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete offer' },
      { status: error.status || 500 }
    );
  }
}
