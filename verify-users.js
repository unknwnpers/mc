
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

async function verifyUsers() {
  console.log('--- USERS COLLECTION ---');
  const snapshot = await getDocs(collection(db, 'users'));
  snapshot.forEach(doc => {
    console.log(`User ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });

  console.log('\n--- ORDERS COLLECTION (LATEST) ---');
  const orderSnapshot = await getDocs(collection(db, 'orders'));
  orderSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Order ID: ${doc.id}`);
    console.log(`  User: ${data.userName} (${data.userId})`);
    console.log(`  Address: ${data.address}`);
    console.log(`  Phone: ${data.phone}`);
    console.log(`  Status: ${data.status}`);
  });
}

verifyUsers().catch(console.error);
