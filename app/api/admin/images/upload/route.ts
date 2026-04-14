import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { verifyAdmin } from '@/lib/rbac';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

interface ImageMetadata {
  id: string;
  fileName: string;
  originalName: string;
  category: 'system' | 'marketing' | 'category' | 'product';
  subcategory: string;
  contentType: string;
  size: number;
  variants: {
    original: { url: string; path: string; width: number; height: number };
    thumbnail?: { url: string; path: string; width: number; height: number };
    medium?: { url: string; path: string; width: number; height: number };
  };
  uploadedAt: any;
  uploadedBy: string;
  isActive: boolean;
}

/**
 * POST /api/admin/images/upload
 * Upload image to Firebase Storage with metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'marketing';
    const subcategory = (formData.get('subcategory') as string) || 'general';

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
    const sanitizedName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '-');
    const fileName = `${timestamp}-${sanitizedName}`;

    // Storage path: {category}/{subcategory}/original/{filename}
    const storagePath = `${category}/${subcategory}/original/${fileName}`;
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
          category,
          subcategory,
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Get image dimensions
    let width = 0;
    let height = 0;
    
    // For now, we'll store without dimensions - can be enhanced with sharp library
    width = 0;
    height = 0;

    // Create metadata document
    const metadataRef = adminDb.collection('image_metadata').doc();
    const metadata: ImageMetadata = {
      id: metadataRef.id,
      fileName,
      originalName: file.name,
      category: category as any,
      subcategory,
      contentType: file.type,
      size: file.size,
      variants: {
        original: {
          url: publicUrl,
          path: storagePath,
          width,
          height,
        },
      },
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: admin.uid,
      isActive: true,
    };

    await metadataRef.set(metadata);

    return NextResponse.json({
      success: true,
      image: {
        ...metadata,
        id: metadataRef.id,
        url: publicUrl,
      },
    });

  } catch (error: any) {
    console.error('[Image Upload API] Error:', error);
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
