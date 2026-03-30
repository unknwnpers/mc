import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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
    const expiredQuery = adminDb.collection("reservations")
      .where("status", "==", "active")
      .where("expiresAt", "<", Date.now())
      .limit(20);
    
    const snapshot = await expiredQuery.get();
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

  return await adminDb.runTransaction(async (transaction) => {
    const reservations: string[] = [];

    for (const item of items) {
      const productRef = adminDb.collection("products").doc(item.id);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        throw new Error(`Product ${item.name} not found`);
      }

      const currentStock = productSnap.data()?.stock || 0;

      if (currentStock < item.quantity) {
        throw new Error(`Inufficient stock for ${item.name}`);
      }

      // 1. Temporarily reduce stock
      transaction.update(productRef, {
        stock: currentStock - item.quantity,
        updatedAt: FieldValue.serverTimestamp()
      });

      // 2. Create reservation record
      const resId = `res_${Math.random().toString(36).slice(2, 11)}`;
      const resRef = adminDb.collection("reservations").doc(resId);
      
      transaction.set(resRef, {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        userId,
        status: "active",
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
        createdAt: FieldValue.serverTimestamp()
      });

      reservations.push(resId);
    }

    return reservations;
  });
};

export const confirmReservations = async (reservationIds: string[]) => {
  for (const id of reservationIds) {
    const resRef = adminDb.collection("reservations").doc(id);
    await resRef.update({
      status: "completed",
      updatedAt: FieldValue.serverTimestamp()
    });
  }
};

export const releaseReservations = async (reservationIds: string[]) => {
  return await adminDb.runTransaction(async (transaction) => {
    for (const id of reservationIds) {
      const resRef = adminDb.collection("reservations").doc(id);
      const resSnap = await transaction.get(resRef);

      if (!resSnap.exists) continue;
      const data = resSnap.data();

      if (!data || data.status !== "active") continue;

      const productRef = adminDb.collection("products").doc(data.productId);
      const productSnap = await transaction.get(productRef);

      if (productSnap.exists) {
        const currentStock = productSnap.data()?.stock || 0;
        transaction.update(productRef, {
          stock: currentStock + data.quantity,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(resRef, {
        status: "released",
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });
};
