import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage, verifyAppCheckFromRequest } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/rbac';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface ImageMetadata {
  id: string;
  fileName: string;
  originalName: string;
  entityType: 'products';
  entityId: string;
  variant: 'original' | 'thumbnail' | 'medium';
  contentType: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: any;
  uploadedBy: string;
}

/**
 * POST /api/admin/products/upload-image
 * Upload product image to Firebase Storage with metadata
 * Server-side upload with App Check verification
 */
export async function POST(request: NextRequest) {
  try {
    // 🔐 Layer 1: App Check verification (without replay protection for uploads)
    const appCheckResult = await verifyAppCheckFromRequest(request);
    if (!appCheckResult.valid) {
      console.warn('[Product Image Upload] App Check failed:', appCheckResult.error);
      return NextResponse.json(
        { success: false, error: appCheckResult.error || 'App verification failed' },
        { status: 403 }
      );
    }

    // 🔐 Layer 2: Admin verification
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = (formData.get('productId') as string) || `temp_${Date.now()}`;
    const variant = (formData.get('variant') as 'original' | 'thumbnail' | 'medium') || 'original';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Whitelist allowed extensions
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!allowedExts.includes(originalExt)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Allowed: ${allowedExts.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Sanitize filename
    const sanitizedName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const fileName = `${timestamp}-${sanitizedName}`;

    // Storage path: products/{productId}/{variant}/{filename}
    const storagePath = `products/${productId}/${variant}/${fileName}`;
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Firebase Storage
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: admin.uid,
          uploadedAt: new Date().toISOString(),
          productId,
          variant,
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Save metadata to Firestore (optional, for tracking)
    const metadataRef = adminDb.collection('product_images').doc();
    const metadata: ImageMetadata = {
      id: metadataRef.id,
      fileName,
      originalName: file.name,
      entityType: 'products',
      entityId: productId,
      variant,
      contentType: file.type,
      size: file.size,
      url: publicUrl,
      path: storagePath,
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: admin.uid,
    };

    await metadataRef.set(metadata);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      metadata: {
        id: metadataRef.id,
        fileName,
        variant,
        path: storagePath,
      },
    });

  } catch (error: any) {
    console.error('[Product Image Upload API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
