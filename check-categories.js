const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkData() {
  console.log('--- CATEGORIES ---');
  const catSnap = await db.collection('categories').get();
  catSnap.forEach(doc => {
    console.log(`Cat: ${doc.data().name} | Slug: ${doc.data().slug}`);
  });

  console.log('\n--- PRODUCTS (First 5) ---');
  const prodSnap = await db.collection('products').limit(5).get();
  prodSnap.forEach(doc => {
    const d = doc.data();
    console.log(`Prod: ${d.name} | CatID: ${d.category_id} | CatSlug: ${d.category_slug}`);
  });
}

checkData();
