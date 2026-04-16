/**
 * Seed script: Create default categories in Firestore
 * Run: npx tsx --env-file=.env.local scripts/seed-categories.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase Admin credentials');
  console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();

// Exact category structure with specific document IDs
const defaultCategories = [
  { id: 'feeding-wear', name: 'Feeding Wear', slug: 'feeding-wear', is_active: true, priority: 1 },
  { id: 'baby-wear', name: 'Baby Wear', slug: 'baby-wear', is_active: true, priority: 2 },
  { id: 'kids-wear', name: 'Kids Wear', slug: 'kids-wear', is_active: true, priority: 3 },
  { id: 'maternity', name: 'Maternity', slug: 'maternity', is_active: true, priority: 4 },
  { id: 'accessories', name: 'Accessories', slug: 'accessories', is_active: true, priority: 5 },
];

async function seedCategories() {
  console.log('Seeding categories...\n');

  const batch = db.batch();
  const now = Timestamp.now();

  for (const cat of defaultCategories) {
    // Use specific document ID
    const docRef = db.collection('categories').doc(cat.id);
    batch.set(docRef, {
      name: cat.name,
      slug: cat.slug,
      is_active: cat.is_active,
      priority: cat.priority,
      created_at: now,
      updated_at: now,
    });
    console.log(`Creating: ${cat.name} (id: ${cat.id})`);
  }

  await batch.commit();
  console.log(`\n✅ Created ${defaultCategories.length} categories`);
}

seedCategories().catch(console.error);
