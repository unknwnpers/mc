/**
 * Check if required environment variables are set for Vercel deployment
 * Run: node scripts/check-vercel-env.js
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const optionalEnvVars = [
  'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
  'NEXT_PUBLIC_MEASUREMENT_ID',
  'RAZORPAY_KEY_ID',
  'NEXT_PUBLIC_RAZORPAY_KEY_ID',
];

console.log('Checking environment variables for Vercel deployment...\n');

console.log('Required Variables:');
console.log('===================');
let missingRequired = 0;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✓ ${varName}: Set`);
  } else {
    console.log(`✗ ${varName}: MISSING`);
    missingRequired++;
  }
});

console.log('\nOptional Variables:');
console.log('===================');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✓ ${varName}: Set`);
  } else {
    console.log(`○ ${varName}: Not set (optional)`);
  }
});

console.log('\n' + '='.repeat(50));
if (missingRequired === 0) {
  console.log('✅ All required environment variables are set!');
} else {
  console.log(`❌ ${missingRequired} required variable(s) missing!`);
  console.log('\nTo fix this:');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to Settings > Environment Variables');
  console.log('4. Add the missing variables');
  console.log('5. Redeploy the project');
}
