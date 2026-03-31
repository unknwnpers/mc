# 🚨 VERCEL DEPLOYMENT - CRITICAL FIX REQUIRED

## 🔴 Current Issue

Your live site is showing **500 Internal Server Error** on all admin API routes because:

```
❌ Firebase Admin SDK environment variables are missing in Vercel
❌ Server-side APIs cannot initialize Firebase Admin
```

---

## ✅ STEP-BY-STEP FIX

### **Step 1: Generate Firebase Service Account Key**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **⚙️ Settings** → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file (e.g., `serviceAccountKey.json`)

---

### **Step 2: Add Environment Variables to Vercel**

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

**Production Environment:**

| Variable Name | Value |
|--------------|-------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Paste entire JSON content from Step 1 as a **single line** |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From your `.env.local` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From your `.env.local` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From your `.env.local` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From your `.env.local` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From your `.env.local` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From your `.env.local` |
| `BYPASS_RAZORPAY` | `true` |

**Important:** 
- Set scope to **Production**, **Preview**, and **Development** (all three)
- Click **Save** after each variable

---

#### Option B: Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Import environment variables from .env.local
vercel env pull

# Manually add FIREBASE_SERVICE_ACCOUNT_KEY
vercel env add FIREBASE_SERVICE_ACCOUNT_KEY
# Paste your service account JSON when prompted
# Select: Production, Preview, Development (all)

# Redeploy
vercel --prod
```

---

### **Step 3: Format Service Account JSON Correctly**

The JSON must be on a **single line** with escaped newlines:

**Wrong:**
```json
{
  "type": "service_account",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
}
```

**Correct (single line):**
```json
{"type":"service_account","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

**Tip:** Use this command to format it:
```bash
cat serviceAccountKey.json | tr -d '\n' | sed 's/  */ /g'
```

Or use an online JSON minifier.

---

### **Step 4: Redeploy on Vercel**

After adding environment variables:

1. Go to Vercel Dashboard → Your Project
2. Go to **Deployments** tab
3. Click on the latest deployment
4. Click **Redeploy** button
5. Wait for build to complete (~2-3 minutes)

**OR trigger redeploy via Git:**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### **Step 5: Verify Fix**

After redeployment:

1. Visit `https://www.miksandchiks.com/admin`
2. Check browser console for errors
3. Verify admin dashboard loads
4. Test these routes:
   - `/api/admin/analytics`
   - `/api/admin/products`
   - `/api/admin/users`

All should return **200 OK** instead of 500 error.

---

## 🔍 Troubleshooting

### Still getting 500 errors?

**Check Vercel Function Logs:**

1. Go to Vercel Dashboard → Your Project
2. Click **Functions** tab
3. Find failing route (e.g., `/api/admin/products`)
4. Click to view logs
5. Look for error messages

**Common Issues:**

| Error | Solution |
|-------|----------|
| `Cannot find module 'firebase-admin'` | Run `npm install` and redeploy |
| `Invalid credentials` | Regenerate service account key |
| `Missing environment variables` | Double-check variable names in Vercel |
| `Malformed JSON` | Ensure JSON is single line with escaped newlines |

---

### Test Locally with Production Env Vars

```bash
# Pull production env vars from Vercel
vercel env pull

# Run build locally
npm run build

# Test production build
npm start
```

---

## 📋 Environment Variable Checklist

Make sure ALL these are set in Vercel:

### Required (Must Have):
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY` OR (`FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

### Optional (Can Skip):
- [ ] `RAZORPAY_KEY_ID` (if BYPASS_RAZORPAY=true)
- [ ] `RAZORPAY_KEY_SECRET` (if BYPASS_RAZORPAY=true)
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` (if BYPASS_RAZORPAY=true)

---

## 🎯 Expected Result After Fix

✅ Admin dashboard loads without errors  
✅ All API routes return 200 status  
✅ No `Unexpected token 'export'` errors  
✅ Products, users, orders pages work  
✅ Analytics endpoint responds  

---

## ⚠️ Important Notes

1. **Environment variables take ~1-2 minutes to propagate** after saving
2. **You MUST redeploy** after adding environment variables
3. **Use Production scope** for live site
4. **Keep service account JSON private** - never commit to Git
5. **Rotate keys periodically** for security

---

## 🆘 Need Help?

If still stuck after following all steps:

1. Check Vercel deployment logs for specific errors
2. Verify Firestore rules allow access
3. Ensure Firebase project ID matches
4. Contact Vercel support with function logs

---

**Last Updated:** Production deployment guide v1.0  
**Status:** ✅ Verified working configuration
