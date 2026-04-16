/**
 * Seed script: Create default categories in Firestore
 * Run: npx ts-node scripts/seed-categories.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = require('../serviceAccountKey.json');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

const defaultCategories = [
  { name: 'Feeding', slug: 'feeding', description: 'Baby feeding bottles, breast pumps, and accessories', image: '/feeding.jpg' },
  { name: 'Newborn', slug: 'newborn', description: 'Essentials for newborn babies', image: '/newborn.jpg' },
  { name: 'Kids', slug: 'kids', description: 'Products for growing kids', image: '/kids.jpg' },
  { name: 'Mother & Baby', slug: 'mother-baby', description: 'Products for mothers and babies', image: '/mother-baby.jpg' },
  { name: 'Accessories', slug: 'accessories', description: 'Baby and mother accessories', image: '/accessories.jpg' },
];

async function seedCategories() {
  console.log('Seeding categories...\n');

  const batch = db.batch();
  const now = Timestamp.now();

  for (const cat of defaultCategories) {
    const docRef = db.collection('categories').doc();
    batch.set(docRef, {
      ...cat,
      created_at: now,
      updated_at: now,
      isActive: true,
    });
    console.log(`Creating: ${cat.name}`);
  }

  await batch.commit();
  console.log(`\n✅ Created ${defaultCategories.length} categories`);
}

seedCategories().catch(console.error);
