/**
 * Bulk Product Import API
 * Creates products from Excel data with minimal fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySuperAdmin } from '@/lib/rbac';
import { logSecurityEvent } from '@/lib/logger';
import { getClientInfo } from '@/lib/logger';

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

interface ImportVariant {
  size: string;
  price: number;
  stock: number;
  sku: string;
}

interface ImportProduct {
  name: string;
  category_slug: string;
  imageUrl?: string;
  variants: ImportVariant[];
}

export async function POST(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const { products, mergeDuplicates = false, sizeFix = null, sizeIssues = [] } = await request.json();
    
    if (!Array.isArray(products)) {
      return NextResponse.json(
        { success: false, error: 'Invalid products data' },
        { status: 400 }
      );
    }

    if (products.length === 0 && sizeFix !== 'skip') {
      return NextResponse.json(
        { success: false, error: 'No products to import' },
        { status: 400 }
      );
    }

    if (products.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 products per import' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      converted: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Track size conversions for reporting
    const sizeConversionMap: Record<string, string> = {
      'S': '0-3M', 'M': '3-6M', 'L': '6-9M', 'XL': '9-12M'
    };

    // Process each product
    for (const product of products as ImportProduct[]) {
      try {
        // Check if product already exists (by name)
        const existingQuery = await adminDb
          .collection('products')
          .where('name', '==', product.name)
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          // Update existing product - MERGE variants (production-grade)
          const existingDoc = existingQuery.docs[0];
          const existingData = existingDoc.data();
          
          // Get existing variants
          const existingVariants = existingData.variants || [];
          
          // Merge: Group by size, latest price wins, stock sums
          const variantMap = new Map<string, any>();
          
          // Add existing variants to map
          existingVariants.forEach((ev: any) => {
            const size = ev.options?.Size || ev.size;
            if (size) {
              variantMap.set(size, ev);
            }
          });
          
          // Merge incoming variants
          product.variants.forEach((nv: ImportVariant) => {
            const existing = variantMap.get(nv.size);
            if (existing) {
              // Merge: latest price wins, stock sums
              variantMap.set(nv.size, {
                ...existing,
                price: nv.price,  // Latest price wins
                stock: (existing.stock || 0) + nv.stock,  // Stock sums
                sku: nv.sku  // Update SKU
              });
            } else {
              // New variant
              variantMap.set(nv.size, {
                sku: nv.sku,
                price: nv.price,
                stock: nv.stock,
                options: { Size: nv.size }
              });
            }
          });
          
          const mergedVariants = Array.from(variantMap.values());

          // Update product with merged variants
          await existingDoc.ref.update({
            variants: mergedVariants,
            options: [{
              name: 'Size',
              values: mergedVariants.map((v: any) => v.options?.Size || v.size)
            }],
            updatedAt: FieldValue.serverTimestamp()
          });
          results.updated++;
          
        } else {
          // Create new product (clean, normalized data)
          const slug = generateSlug(product.name);
          
          // Ensure no duplicate sizes in new product
          const variantMap = new Map<string, ImportVariant>();
          product.variants.forEach(v => {
            if (!variantMap.has(v.size)) {
              variantMap.set(v.size, v);
            } else {
              // Merge duplicates within same import
              const existing = variantMap.get(v.size)!;
              variantMap.set(v.size, {
                ...existing,
                price: v.price,  // Latest wins
                stock: existing.stock + v.stock  // Sum
              });
            }
          });
          
          const dedupedVariants = Array.from(variantMap.values());
          
          const productData = {
            name: product.name,
            slug,
            category_slug: product.category_slug,
            description: '', // Admin adds later
            images: product.imageUrl ? [product.imageUrl] : [],
            isActive: true,      // Default - admin toggles later
            is_featured: false,  // Default - admin controls
            variants: dedupedVariants.map(v => ({
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              options: { Size: v.size }
            })),
            options: [{
              name: 'Size',
              values: dedupedVariants.map(v => v.size)
            }],
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          };

          await adminDb.collection('products').add(productData);
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`"${product.name}": ${error.message}`);
      }
    }

    // Log security event
    await logSecurityEvent({
      type: 'ADMIN_ACTION',
      action: 'BULK_PRODUCT_IMPORT',
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: results.failed === 0 ? 'SUCCESS' : 'FAILED',
      metadata: {
        total: products.length,
        created: results.created,
        updated: results.updated,
        failed: results.failed
      },
      timestamp: new Date()
    });

    return NextResponse.json({
      success: results.failed === 0,
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Import failed' },
      { status: error.status || 500 }
    );
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}
