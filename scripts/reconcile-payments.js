import { db } from "../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

/**
 * PRODUCTION RECONCILIATION SCRIPT
 * -------------------------------
 * Purpose: Cross-references Firestore 'orders' with expectations.
 * In a real production environment, this would also call:
 * 'razorpay.orders.all()' and 'razorpay.payments.all()' to match IDs.
 * 
 * This version identifies "Orphan Pending" orders that should be failed
 * because their reservations have expired.
 */

async function reconcile() {
  console.log("Starting Reconciliation Job...");
  const now = Date.now();
  
  // 1. Find 'pending_payment' orders older than 30 minutes
  const q = query(
    collection(db, "orders"),
    where("status", "==", "pending_payment")
  );
  
  const snapshot = await getDocs(q);
  console.log(`Auditing ${snapshot.size} pending orders...`);
  
  let fixedCount = 0;
  
  for (const orderDoc of snapshot.docs) {
    const data = orderDoc.data();
    const createdAt = data.createdAt?.toDate()?.getTime() || 0;
    
    // If order is older than 30 minutes and still pending
    if (now - createdAt > 30 * 60 * 1000) {
      console.warn(`[STALE] Order ${orderDoc.id} (Razorpay: ${data.razorpayOrderId}) is stale.`);
      
      // Mark as failed (to release UI/Cart state)
      // Note: Stock is released by the 'cleanupExpiredReservations' logic separately
      await updateDoc(doc(db, "orders", orderDoc.id), {
        status: "failed",
        reconciliationNote: "Auto-failed by reconciliation job (timeout)",
        updatedAt: new Date()
      });
      fixedCount++;
    }
  }
  
  console.log(`Reconciliation Complete. Fixed ${fixedCount} stale orders.`);
}

reconcile().catch(console.error);
