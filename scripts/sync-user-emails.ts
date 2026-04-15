/**
 * Migration Script: Sync user emails from Firebase Auth to Firestore
 * Usage: npx ts-node scripts/sync-user-emails.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

interface SyncResult {
  uid: string;
  success: boolean;
  email?: string;
  displayName?: string;
  error?: string;
}

async function syncUserEmails() {
  console.log('🚀 Starting user email sync...\n');

  try {
    initializeFirebase();

    const auth = getAuth();
    const db = getFirestore();

    // Get all users from Firebase Auth
    console.log('📥 Fetching users from Firebase Auth...');
    const listUsersResult = await auth.listUsers(1000); // Adjust if you have more users
    const authUsers = listUsersResult.users;

    console.log(`Found ${authUsers.length} users in Firebase Auth\n`);

    const results: SyncResult[] = [];
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const authUser of authUsers) {
      try {
        const userRef = db.collection('users').doc(authUser.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          console.log(`⚠️ User ${authUser.uid} not found in Firestore, skipping...`);
          skippedCount++;
          results.push({
            uid: authUser.uid,
            success: false,
            error: 'User not found in Firestore',
          });
          continue;
        }

        const userData = userSnap.data();
        const needsEmailSync = authUser.email && !userData?.email;
        const needsNameSync = authUser.displayName && !userData?.name;
        const needsPhoneSync = authUser.phoneNumber && !userData?.phone;

        if (!needsEmailSync && !needsNameSync && !needsPhoneSync) {
          console.log(`✓ User ${authUser.uid} already has all data, skipping...`);
          skippedCount++;
          results.push({
            uid: authUser.uid,
            success: true,
            email: userData?.email,
            displayName: userData?.name,
          });
          continue;
        }

        // Build update data
        const updateData: Record<string, any> = {
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (needsEmailSync) {
          updateData.email = authUser.email;
          console.log(`📝 Syncing email for ${authUser.uid}: ${authUser.email}`);
        }

        if (needsNameSync) {
          updateData.name = authUser.displayName;
          console.log(`📝 Syncing name for ${authUser.uid}: ${authUser.displayName}`);
        }

        if (needsPhoneSync) {
          updateData.phone = authUser.phoneNumber;
          console.log(`📝 Syncing phone for ${authUser.uid}: ${authUser.phoneNumber}`);
        }

        // Also ensure new fields exist
        if (userData?.isActive === undefined) {
          updateData.isActive = true;
        }
        if (userData?.defaultAddressId === undefined) {
          updateData.defaultAddressId = null;
        }
        if (userData?.loginCount === undefined) {
          updateData.loginCount = 1;
        }

        await userRef.update(updateData);
        updatedCount++;

        results.push({
          uid: authUser.uid,
          success: true,
          email: authUser.email || userData?.email,
          displayName: authUser.displayName || userData?.name,
        });

        console.log(`✅ Updated user ${authUser.uid}\n`);
      } catch (error: any) {
        console.error(`❌ Error syncing user ${authUser.uid}:`, error.message);
        errorCount++;
        results.push({
          uid: authUser.uid,
          success: false,
          error: error.message,
        });
      }
    }

    // Summary
    console.log('\n📊 Sync Summary:');
    console.log('================');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`Total: ${authUsers.length}`);

    // Save results to file
    const fs = await import('fs');
    const resultsPath = './user-sync-results.json';
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          syncedAt: new Date().toISOString(),
          summary: {
            total: authUsers.length,
            updated: updatedCount,
            skipped: skippedCount,
            errors: errorCount,
          },
          results,
        },
        null,
        2
      )
    );
    console.log(`\n📝 Results saved to: ${resultsPath}`);

    console.log('\n✨ Sync complete!');
  } catch (error: any) {
    console.error('\n💥 Sync failed:', error.message);
    process.exit(1);
  }
}

// Run sync
syncUserEmails();
