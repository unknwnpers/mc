import { db } from "@/lib/firebase";
import { 
  runTransaction, 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import { auditLog } from "./logger";

/**
 * Reservatonal Stock Control
 * Prevents overselling by locking stock during checkout.
 */


/**
 * Lazy Cleanup: Release expired active reservations
 */
export const cleanupExpiredReservations = async () => {
  try {
    const expiredQuery = query(
      collection(db, "reservations"),
      where("status", "==", "active"),
      where("expiresAt", "<", Date.now()),
      limit(20) // Process in small batches
    );
    
    const snapshot = await getDocs(expiredQuery);
    if (snapshot.empty) return;

    const ids = snapshot.docs.map(doc => doc.id);
    await releaseReservations(ids);
    
    await auditLog("INFO", {
      event: "STALE_RESERVATIONS_CLEANUP",
      details: { count: ids.length }
    });
  } catch (err) {
    console.error("Cleanup error:", err);
  }
};

export const reserveStock = async (items: any[], userId: string) => {
  // Trigger lazy cleanup occasionally
  if (Math.random() < 0.2) { // 20% chance on every reserve
     cleanupExpiredReservations();
  }

  return await runTransaction(db, async (transaction) => {
    const reservations: string[] = [];

    for (const item of items) {
      const productRef = doc(db, "products", item.id);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`Product ${item.name} not found`);
      }

      const currentStock = productSnap.data().stock || 0;

      if (currentStock < item.quantity) {
        throw new Error(`Inufficient stock for ${item.name}`);
      }

      // 1. Temporarily reduce stock
      transaction.update(productRef, {
        stock: currentStock - item.quantity,
        updatedAt: serverTimestamp()
      });

      // 2. Create reservation record
      const resId = `res_${Math.random().toString(36).slice(2, 11)}`;
      const resRef = doc(db, "reservations", resId);
      
      transaction.set(resRef, {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        userId,
        status: "active",
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        createdAt: serverTimestamp()
      });

      reservations.push(resId);
    }

    return reservations;
  });
};

export const confirmReservations = async (reservationIds: string[]) => {
  for (const id of reservationIds) {
    const resRef = doc(db, "reservations", id);
    await updateDoc(resRef, {
      status: "completed",
      updatedAt: serverTimestamp()
    });
  }
};

export const releaseReservations = async (reservationIds: string[]) => {
  return await runTransaction(db, async (transaction) => {
    for (const id of reservationIds) {
      const resRef = doc(db, "reservations", id);
      const resSnap = await transaction.get(resRef);

      if (!resSnap.exists()) continue;
      const data = resSnap.data();

      if (data.status !== "active") continue;

      const productRef = doc(db, "products", data.productId);
      const productSnap = await transaction.get(productRef);

      if (productSnap.exists()) {
        const currentStock = productSnap.data().stock || 0;
        transaction.update(productRef, {
          stock: currentStock + data.quantity,
          updatedAt: serverTimestamp()
        });
      }

      transaction.update(resRef, {
        status: "released",
        updatedAt: serverTimestamp()
      });
    }
  });
};
