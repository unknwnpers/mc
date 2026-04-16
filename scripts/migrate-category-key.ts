/**
 * Migration script: Add categoryKey field to existing image_metadata documents
 * Run: npx ts-node scripts/migrate-category-key.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

async function migrateCategoryKey() {
  console.log('Starting categoryKey migration...\n');

  const snapshot = await db.collection('image_metadata').get();
  console.log(`Found ${snapshot.size} documents to process`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Skip if already has categoryKey
    if (data.categoryKey) {
      skipped++;
      continue;
    }

    // Generate categoryKey from category and subcategory
    const category = data.category || 'unknown';
    const subcategory = data.subcategory || 'general';
    const categoryKey = `${category}_${subcategory}`;

    try {
      await doc.ref.update({ categoryKey });
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`Progress: ${updated} updated, ${skipped} skipped`);
      }
    } catch (err) {
      console.error(`Error updating ${doc.id}:`, err);
      errors++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
  console.log(`Total:    ${snapshot.size}`);
}

migrateCategoryKey().catch(console.error);
