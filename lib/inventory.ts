/**
 * Inventory Service — Canonical Schema (variants: Variant[])
 *
 * Variant SKU lookup: variants.find(v => v.sku === sku)
 * Stock update: read array → modify index → write entire array (transactional)
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ProductVariant } from "@/lib/types";

export interface CartItem {
  id: string;           // productId
  name: string;
  sku: string;          // variant SKU — canonical identifier
  selectedSize: string; // display alias (= sku for size-only products)
  quantity: number;
}

// ── Reserve ───────────────────────────────────────────────────────────────────
export async function reserveStock(items: CartItem[], userId: string): Promise<string> {
  const reservationRef = adminDb.collection("reservations").doc();

  await adminDb.runTransaction(async (tx) => {
    for (const item of items) {
      if (!item.id || !item.sku || item.quantity <= 0) {
        throw new Error(`Invalid cart item: ${JSON.stringify(item)}`);
      }

      const productRef  = adminDb.collection("products").doc(item.id);
      const productSnap = await tx.get(productRef);

      if (!productSnap.exists) {
        throw new Error(`Product not found: ${item.id}`);
      }

      const data     = productSnap.data()!;
      const variants = (data.variants || []) as ProductVariant[];
      const idx      = variants.findIndex(v => v.sku === item.sku);

      if (idx === -1) {
        throw new Error(`SKU "${item.sku}" not found for product "${data.name || item.id}"`);
      }

      const variant = variants[idx];

      if (variant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${data.name || item.id}" (${item.sku}). ` +
          `Requested: ${item.quantity}, Available: ${variant.stock}`
        );
      }

      // Update the array immutably
      const updatedVariants = variants.map((v, i) =>
        i === idx ? { ...v, stock: v.stock - item.quantity } : v
      );

      tx.update(productRef, {
        variants:  updatedVariants,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Reservation record — written in the SAME transaction
    tx.set(reservationRef, {
      userId,
      items: items.map(i => ({
        productId:   i.id,
        productName: i.name,
        sku:         i.sku,
        selectedSize: i.selectedSize,
        quantity:    i.quantity,
      })),
      status:    "reserved",
      expiresAt: Date.now() + 15 * 60 * 1000,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return reservationRef.id;
}

// ── Confirm ───────────────────────────────────────────────────────────────────
export async function confirmReservation(reservationId: string): Promise<void> {
  await adminDb.collection("reservations").doc(reservationId).update({
    status:    "paid",
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// ── Release ───────────────────────────────────────────────────────────────────
export async function releaseReservation(reservationId: string): Promise<void> {
  await adminDb.runTransaction(async (tx) => {
    const resRef  = adminDb.collection("reservations").doc(reservationId);
    const resSnap = await tx.get(resRef);

    if (!resSnap.exists) return;
    const res = resSnap.data()!;
    if (res.status !== "reserved") return;

    for (const item of res.items) {
      const productRef  = adminDb.collection("products").doc(item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists) continue;

      const data     = productSnap.data()!;
      const variants = (data.variants || []) as ProductVariant[];
      const idx      = variants.findIndex(v => v.sku === item.sku);
      if (idx === -1) continue;

      const updatedVariants = variants.map((v, i) =>
        i === idx ? { ...v, stock: v.stock + item.quantity } : v
      );

      tx.update(productRef, {
        variants:  updatedVariants,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.update(resRef, {
      status:    "released",
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
