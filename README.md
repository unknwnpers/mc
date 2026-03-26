# Miks & Chiks | Premium Maternity & Kids Wear

Welcome to the official repository of **Miks & Chiks**, a high-end e-commerce platform dedicated to providing the finest maternity and kids wear. Designed with a "Soft Premium" aesthetic, the platform offers a seamless, trust-driven shopping experience for mothers and little ones.

---

## ✨ Key Features
- **Soft Premium UI/UX**: A boutique-inspired interface featuring the `Cormorant Garamond` serif typeface and a refined Blush & Gold palette.
- **Category-Aware Sizing**: Intelligent size selection systems tailored for Baby (0-24M), Kids (2-12Y), and Maternity/Feeding apparel.
- **Secure Checkout**: Server-authoritative payment flow with Razorpay integration and HMAC signature verification for webhooks.
- **Real-Time Order Tracking**: High-fidelity order history and detail pages with precise temporal metadata and status timelines.
- **Favorites & Profile**: Comprehensive user profile management with a dedicated "Saved Items" section.
- **Atomic Stock Control**: Firestore Transactions ensure inventory integrity during peak checkout moments.

---

## 🛠 Tech Stack
- **Framework**: [Next.js 13+ (App Router)](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Firebase (Firestore & Google Auth)](https://firebase.google.com/)
- **Payments**: [Razorpay SDK](https://razorpay.com/docs/payments/server-integration/nodejs/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- A Firebase Project
- A Razorpay Account (Optional for Test Mode)

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and populate it with the following keys:

```text
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Razorpay (Optional: Required for Live Mode)
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id

# Testing & Bypass
BYPASS_RAZORPAY=true # Set to 'true' to skip live payment gateway
```

### 4. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

## 🏗 Architecture Notes
- **Lazy Loading**: The Razorpay client is initialized lazily via `getRazorpayClient()` to prevent CI/CD build failures when environment secrets are missing.
- **Size Propagation**: Product sizes are treated as unique line items in the `CartContext`, allowing for accurate multi-size orders of the same product.
- **Bypass Mode**: When `BYPASS_RAZORPAY` is active, the system generates mock order IDs and pre-approves transaction status in Firestore for rapid prototyping.

---

## 🎯 Project Goals
- [x] Redesign global layout with "Soft Premium" aesthetics.
- [x] Implement category-specific size selection logic.
- [x] Secure server-side payment validation.
- [x] High-fidelity order history timeline.
- [ ] Implement Admin Dashboard for fulfillment tracking.
- [ ] Advanced Size-wise Stock Management.

Built with ❤️ for **Miks & Chiks**.
