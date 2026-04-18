export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const RATE_LIMIT_MS = 60 * 1000; // 1 minute between view updates from same session

export async function POST(
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate sessionId length (prevent abuse)
    if (sessionId.length < 10 || sessionId.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Sanitize sessionId (alphanumeric only)
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedSessionId !== sessionId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session ID characters' },
        { status: 400 }
      );
    }

    const docId = `${id}_${sanitizedSessionId}`;
    const viewRef = adminDb.collection('product_views').doc(docId);
    const now = Date.now();

    // Check rate limit
    const existingDoc = await viewRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;
    
    if (existingData) {
      const lastViewedAt = existingData?.viewedAt || 0;
      
      if (now - lastViewedAt < RATE_LIMIT_MS) {
        // Rate limited - just update the timestamp without counting as new view
        await viewRef.update({
          viewedAt: now,
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        return NextResponse.json({
          success: true,
          message: 'View updated (rate limited)',
          rateLimited: true,
        });
      }
    }

    // Create or update the view record
    await viewRef.set({
      productId: id,
      sessionId: sanitizedSessionId,
      viewedAt: now,
      createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'View recorded',
      rateLimited: false,
    });

  } catch (error: any) {
    console.error('[Product View API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record view',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Cleanup view on page unload (optional)
export async function DELETE(
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

    const body = await request.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const docId = `${id}_${sanitizedSessionId}`;
    
    await adminDb.collection('product_views').doc(docId).delete();

    return NextResponse.json({
      success: true,
      message: 'View removed',
    });

  } catch (error: any) {
    console.error('[Product View API] Cleanup Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove view',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
