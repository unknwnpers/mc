/**
 * Migration Script: Upload public folder images to Firebase Storage
 * Usage: npx ts-node scripts/migrate-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Configuration
const PUBLIC_FOLDER = path.join(process.cwd(), 'public');
const IMAGES_TO_MIGRATE = [
  {
    file: 'logo.png',
    category: 'system',
    subcategory: 'logo',
    description: 'Site logo',
  },
  {
    file: '1logo.png',
    category: 'system',
    subcategory: 'logo-alt',
    description: 'Alternative logo',
  },
  {
    file: 'placeholder.svg',
    category: 'system',
    subcategory: 'placeholder',
    description: 'Placeholder image',
  },
  {
    file: 'mother-baby.jpg',
    category: 'marketing',
    subcategory: 'homepage',
    description: 'Hero image for homepage',
  },
  {
    file: 'pregnant-lady.jpg',
    category: 'marketing',
    subcategory: 'categories',
    description: 'Maternity category image',
  },
  {
    file: 'newborn.jpg',
    category: 'marketing',
    subcategory: 'categories',
    description: 'Newborn category image',
  },
  {
    file: 'kids.jpg',
    category: 'marketing',
    subcategory: 'categories',
    description: 'Kids category image',
  },
  {
    file: 'feeding.jpg',
    category: 'marketing',
    subcategory: 'categories',
    description: 'Feeding category image',
  },
  {
    file: 'accessories.jpg',
    category: 'marketing',
    subcategory: 'categories',
    description: 'Accessories category image',
  },
];

interface MigrationResult {
  file: string;
  success: boolean;
  imageId?: string;
  url?: string;
  error?: string;
}

// Initialize Firebase Admin
function initializeFirebase() {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });

  console.log('✅ Firebase Admin initialized');
}

// Get content type based on file extension
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Upload single image
async function uploadImage(
  imageConfig: typeof IMAGES_TO_MIGRATE[0]
): Promise<MigrationResult> {
  const filePath = path.join(PUBLIC_FOLDER, imageConfig.file);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      file: imageConfig.file,
      success: false,
      error: 'File not found',
    };
  }

  try {
    const db = getFirestore();
    const storage = getStorage();
    const bucket = storage.bucket();

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);
    const timestamp = Date.now();
    const sanitizedName = imageConfig.file.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    const fileName = `${timestamp}-${sanitizedName}`;

    // Storage path
    const storagePath = `${imageConfig.category}/${imageConfig.subcategory}/original/${fileName}`;

    // Upload to Firebase Storage
    const fileRef = bucket.file(storagePath);
    await fileRef.save(fileBuffer, {
      metadata: {
        contentType,
        metadata: {
          migrated: 'true',
          originalFile: imageConfig.file,
          description: imageConfig.description,
          migratedAt: new Date().toISOString(),
        },
      },
    });

    // Make file publicly accessible
    await fileRef.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    // Create metadata document
    const metadataRef = db.collection('image_metadata').doc();
    await metadataRef.set({
      fileName,
      originalName: imageConfig.file,
      category: imageConfig.category,
      subcategory: imageConfig.subcategory,
      contentType,
      size: fileBuffer.length,
      variants: {
        original: {
          url: publicUrl,
          path: storagePath,
          width: 0,
          height: 0,
        },
      },
      uploadedAt: FieldValue.serverTimestamp(),
      uploadedBy: 'migration-script',
      isActive: true,
      migrated: true,
      description: imageConfig.description,
    });

    console.log(`✅ Uploaded: ${imageConfig.file} → ${metadataRef.id}`);

    return {
      file: imageConfig.file,
      success: true,
      imageId: metadataRef.id,
      url: publicUrl,
    };
  } catch (error: any) {
    console.error(`❌ Failed: ${imageConfig.file} → ${error.message}`);
    return {
      file: imageConfig.file,
      success: false,
      error: error.message,
    };
  }
}

// Main migration function
async function migrateImages() {
  console.log('🚀 Starting image migration...\n');

  try {
    initializeFirebase();

    const results: MigrationResult[] = [];

    for (const imageConfig of IMAGES_TO_MIGRATE) {
      const result = await uploadImage(imageConfig);
      results.push(result);
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      console.log('\n✅ Successful uploads:');
      successful.forEach((r) => {
        console.log(`  - ${r.file} → ID: ${r.imageId}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed uploads:');
      failed.forEach((r) => {
        console.log(`  - ${r.file}: ${r.error}`);
      });
    }

    // Save mapping file
    const mappingPath = path.join(process.cwd(), 'image-migration-mapping.json');
    fs.writeFileSync(
      mappingPath,
      JSON.stringify(
        {
          migratedAt: new Date().toISOString(),
          results: successful.map((r) => ({
            originalFile: r.file,
            imageId: r.imageId,
            url: r.url,
          })),
        },
        null,
        2
      )
    );
    console.log(`\n📝 Mapping saved to: ${mappingPath}`);

    console.log('\n✨ Migration complete!');
  } catch (error: any) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateImages();
