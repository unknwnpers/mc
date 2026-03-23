const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugOrders() {
  console.log('--- DEBUGGING ORDERS ---');
  const snapshot = await db.collection('orders').get();
  
  if (snapshot.empty) {
    console.log('No orders found in collection.');
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Order ID: ${doc.id}`);
    console.log(`- userId: ${data.userId}`);
    console.log(`- status: ${data.status}`);
    console.log(`- customer: ${data.userName || 'N/A'}`);
    console.log('-------------------------');
  });
}

debugOrders().catch(console.error);
