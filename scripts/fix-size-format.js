/**
 * Script to fix size format in product variants
 * Converts sizes like "12Y" to "1-2Y" based on SKU pattern
 * 
 * Run with: node scripts/fix-size-format.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Size mapping corrections
const sizeCorrections = {
  // Common incorrect formats -> correct formats
  '12Y': '1-2Y',
  '23Y': '2-3Y',
  '34Y': '3-4Y',
  '45Y': '4-5Y',
  '56Y': '5-6Y',
  '67Y': '6-7Y',
  '78Y': '7-8Y',
  '89Y': '8-9Y',
  '910Y': '9-10Y',
  '1011Y': '10-11Y',
  '1112Y': '11-12Y',
  '1213Y': '12-13Y',
  '1314Y': '13-14Y',
  '1415Y': '14-15Y',
};

async function fixSizeFormat() {
  console.log('🔍 Checking product sizes...\n');
  
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  let fixedCount = 0;
  let checkedCount = 0;
  
  for (const doc of snapshot.docs) {
    const product = doc.data();
    const variants = product.variants || [];
    let needsUpdate = false;
    
    const updatedVariants = variants.map(variant => {
      const currentSize = variant.options?.Size;
      
      if (!currentSize) return variant;
      
      checkedCount++;
      
      // Check if size needs correction
      const correctedSize = sizeCorrections[currentSize];
      
      if (correctedSize) {
        console.log(`📦 ${product.name || doc.id}`);
        console.log(`   Size: "${currentSize}" → "${correctedSize}"`);
        console.log(`   SKU: ${variant.sku}\n`);
        
        needsUpdate = true;
        fixedCount++;
        
        return {
          ...variant,
          options: {
            ...variant.options,
            Size: correctedSize
          }
        };
      }
      
      // Also check for other patterns like "1 2Y" (with space) -> "1-2Y"
      if (currentSize.match(/^\d+\s+\d+Y$/)) {
        const fixed = currentSize.replace(/\s+/, '-');
        console.log(`📦 ${product.name || doc.id}`);
        console.log(`   Size: "${currentSize}" → "${fixed}"`);
        console.log(`   SKU: ${variant.sku}\n`);
        
        needsUpdate = true;
        fixedCount++;
        
        return {
          ...variant,
          options: {
            ...variant.options,
            Size: fixed
          }
        };
      }
      
      return variant;
    });
    
    if (needsUpdate) {
      // Update product with fixed variants
      const updatedOptions = [{
        name: 'Size',
        values: updatedVariants.map(v => v.options?.Size || v.size)
      }];
      
      await doc.ref.update({
        variants: updatedVariants,
        options: updatedOptions,
        updatedAt: new Date()
      });
      
      console.log(`✅ Fixed: ${product.name || doc.id}\n`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Products checked: ${snapshot.size}`);
  console.log(`   Variants checked: ${checkedCount}`);
  console.log(`   Sizes fixed: ${fixedCount}`);
}

fixSizeFormat()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
