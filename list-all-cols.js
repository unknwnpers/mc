const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, listCollections } = require('firebase/firestore');
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
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listAll() {
  console.log('Project:', env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  const colNames = ['products', 'categories', 'orders', 'users', 'cart'];
  for (const name of colNames) {
    const snap = await getDocs(collection(db, name));
    console.log(`Collection '${name}': ${snap.size} documents`);
  }
}

listAll().catch(console.error);
