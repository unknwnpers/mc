
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim().replace(/['"]/g, '');
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function auditData() {
  console.log('--- STARTING AUDIT ---\n');

  // 1. Audit Categories
  console.log('--- CATEGORIES ---');
  const catSnapshot = await getDocs(collection(db, 'categories'));
  const categorySlugs = new Set();
  catSnapshot.forEach(doc => {
    const data = doc.data();
    categorySlugs.add(data.slug);
    console.log(`- Category: ${data.name} (slug: ${data.slug})`);
  });

  // 2. Audit Products
  console.log('\n--- PRODUCTS ---');
  const prodSnapshot = await getDocs(collection(db, 'products'));
  let issuesFound = 0;

  prodSnapshot.forEach(doc => {
    const data = doc.data();
    const id = doc.id;
    const errors = [];

    if (!data.name) errors.push('Missing "name"');
    if (!data.price || typeof data.price !== 'number') errors.push('Missing/Invalid "price"');
    if (!data.image_url) errors.push('Missing "image_url"');
    if (!data.category_slug) {
      errors.push('Missing "category_slug"');
    } else if (!categorySlugs.has(data.category_slug)) {
      errors.push(`Invalid "category_slug": "${data.category_slug}" (not in categories collection)`);
    }
    if (!data.created_at) errors.push('Missing "created_at"');
    if (data.is_featured === undefined) errors.push('Missing "is_featured"');
    if (data.stock === undefined) errors.push('Missing "stock"');

    if (errors.length > 0) {
      console.log(`[!] ISSUE in Product ${id} (${data.name || 'Unnamed'}):`);
      errors.forEach(err => console.log(`    - ${err}`));
      issuesFound++;
    } else {
      console.log(`[OK] Product ${id} (${data.name})`);
    }
  });

  console.log(`\n--- AUDIT COMPLETE ---`);
  console.log(`Total Issues Found: ${issuesFound}`);
}

auditData().catch(console.error);
