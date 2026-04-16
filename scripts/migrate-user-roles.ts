/**
 * Migration script: Update users with role "user" to "customer"
 * Run with: npx ts-node scripts/migrate-user-roles.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
  console.error('Missing Firebase Admin credentials. Set env vars:');
  console.error('  FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount as any),
});

const db = getFirestore();

async function migrateUserRoles() {
  console.log('Starting migration: role "user" → "customer"');
  
  try {
    // Find all users with role "user"
    const snapshot = await db.collection('users')
      .where('role', '==', 'user')
      .get();
    
    if (snapshot.empty) {
      console.log('No users found with role "user"');
      return;
    }
    
    console.log(`Found ${snapshot.size} users to migrate`);
    
    // Batch update (Firestore batch limit is 500)
    const batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.update(doc.ref, { 
        role: 'customer',
        updatedAt: new Date().toISOString(),
      });
      count++;
      
      // Commit batch every 500 operations
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`Migrated ${count} users...`);
      }
    }
    
    // Commit remaining
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Migration complete! Updated ${count} users`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUserRoles();
