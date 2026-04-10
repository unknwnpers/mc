/**
 * FULL SCHEMA MIGRATION V2 — Run once after V1.
 *
 * V1 converted:  is_active → isActive,  sizes[] → variants{}
 * V2 converts:   variants{} → variants[]  (Record → Array)
 *
 * Canonical result:
 *   variants: [{ sku: "S", options: { Size: "S" }, price: 499, stock: 10 }]
 *   options:  [{ name: "Size", values: ["S", "M", "L"] }]
 *
 * Idempotent — skips docs with _schemaV2Migrated: true
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!getApps().length) {
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function runMigration() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Schema Migration V2 — variants{} → variants[]");
  console.log("═══════════════════════════════════════════════\n");

  const snapshot = await db.collection("products").get();
  console.log(`Found ${snapshot.size} product(s)\n`);

  let migrated = 0, skipped = 0, errors = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const label = `[${docSnap.id.slice(0, 8)}] "${data.name || "unnamed"}"`;

    // Idempotency guard
    if (data._schemaV2Migrated === true) {
      console.log(`  ⏭  Skipped  ${label}`);
      skipped++;
      continue;
    }

    try {
      const updates: Record<string, any> = {
        _schemaV2Migrated: true,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // ── Case A: variants is already an array (already correct) ────────────
      if (Array.isArray(data.variants)) {
        // Ensure options axis is present
        if (!data.options || data.options.length === 0) {
          const sizes = Array.from(new Set(data.variants.map((v: any) => v.sku as string)));
          updates.options = [{ name: "Size", values: sizes }];
          console.log(`  🔧 ${label}: Added missing options axis`);
        } else {
          console.log(`  ✅ ${label}: Already variants[] — stamped V2`);
        }
      }

      // ── Case B: variants is a Record (legacy V1 schema) ───────────────────
      else if (data.variants && typeof data.variants === "object") {
        const variantRecord: Record<string, { price: number; stock: number }> = data.variants;
        const sizes = Object.keys(variantRecord);

        const variantsArray = sizes.map(size => ({
          sku:     size,
          options: { Size: size },
          price:   Number(variantRecord[size]?.price) || 0,
          stock:   Number(variantRecord[size]?.stock) || 0,
        }));

        updates.variants = variantsArray;
        updates.options  = [{ name: "Size", values: sizes }];

        const summary = variantsArray.map(v => `${v.sku}:₹${v.price}×${v.stock}`).join(", ");
        console.log(`  ✅ ${label}: variants{} → [${summary}]`);
      }

      // ── Case C: no variants at all ─────────────────────────────────────────
      else {
        updates.variants = [];
        updates.options  = [{ name: "Size", values: [] }];
        console.log(`  ⚠️  ${label}: No variants — set empty array (fill in admin)`);
      }

      // ── Ensure images is always an array ──────────────────────────────────
      if (!Array.isArray(data.images)) {
        const single = data.image_url || data.image || null;
        updates.images = single ? [single] : [];
        if (data.image_url) updates.image_url = FieldValue.delete();
        if (data.image)     updates.image     = FieldValue.delete();
      }

      await docSnap.ref.update(updates);
      migrated++;

    } catch (err: any) {
      console.error(`  ❌ ${label}: ${err.message}`);
      errors++;
    }
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  V2 Migration Complete");
  console.log("═══════════════════════════════════════════════");
  console.log(`  ✅ Migrated : ${migrated}`);
  console.log(`  ⏭  Skipped  : ${skipped}`);
  console.log(`  ❌ Errors   : ${errors}`);
  if (errors === 0) {
    console.log("\n  ✔ Ready — run: npm run build\n");
  }
}

runMigration().catch(console.error);
