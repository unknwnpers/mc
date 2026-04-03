# 🧪 COMPREHENSIVE TESTING PLAN

**Project:** Miks & Chiks E-Commerce Platform  
**Test Date:** March 31, 2026  
**Server:** http://localhost:3001  
**Status:** Server Running ✅

---

## 📋 TESTING CHECKLIST

### **PHASE 1: CORE STOREFRONT (Customer Journey)** ⭐

#### **1. Homepage** (/)
- [ ] Page loads without errors
- [ ] Featured products display
- [ ] Categories section visible
- [ ] Hero banner renders
- [ ] Navigation works
- [ ] No console errors

#### **2. Product Listing** (/products)
- [ ] All products load
- [ ] Category filter works
- [ ] Search functionality
- [ ] Sort options functional
- [ ] Pagination (if exists)
- [ ] Product cards render correctly

#### **3. Product Detail** (/products/[id])
- [ ] Product images load
- [ ] Size selection works
- [ ] Stock availability shown
- [ ] Add to cart button functional
- [ ] Reviews section loads
- [ ] Review form works (if purchased)
- [ ] Related products display

#### **4. Shopping Cart** (/cart)
- [ ] Cart items display correctly
- [ ] Quantity update works
- [ ] Remove item works
- [ ] Coupon application works ⚠️ **CRITICAL**
- [ ] Discount calculation correct
- [ ] Final amount updates
- [ ] Profile completion check
- [ ] Checkout button works

#### **5. Authentication** (/login)
- [ ] Login form works
- [ ] Signup form works
- [ ] Google login (if enabled)
- [ ] Redirect after login
- [ ] Profile auto-creation

#### **6. User Profile** (/profile)
- [ ] User details display
- [ ] Address edit works
- [ ] Phone edit works
- [ ] Wallet balance shown
- [ ] Referral code displayed

#### **7. Orders** (/orders)
- [ ] Order history loads
- [ ] Order detail page works
- [ ] Status tracking visible
- [ ] Download invoice option

---

### **PHASE 2: PAYMENT FLOW** 💳

#### **8. Razorpay Integration**
- [ ] Order creation API works
- [ ] Razorpay modal opens
- [ ] Test payment successful
- [ ] Payment verification works
- [ ] Order saved to Firestore
- [ ] Stock reduced correctly
- [ ] Confirmation page displays
- [ ] Email sent (if implemented)

**Test Mode:** `BYPASS_RAZORPAY=true` or use test keys

---

### **PHASE 3: ADMIN PANEL** 👨‍💼

#### **9. Admin Dashboard** (/admin)
- [ ] Access restricted to admins
- [ ] Stats cards display
- [ ] Analytics charts render
- [ ] Recent orders shown
- [ ] Low stock alerts

#### **10. Product Management** (/admin/products)
- [ ] Product list loads
- [ ] Create product works
- [ ] Edit product works
- [ ] Delete (archive) works
- [ ] Permanent delete works
- [ ] Image upload (URL paste)
- [ ] Variant management
- [ ] Stock levels visible

#### **11. Inventory** (/admin/inventory)
- [ ] Stock levels display
- [ ] Low stock filtering
- [ ] Bulk update works
- [ ] Inventory valuation

#### **12. Orders** (/admin/orders)
- [ ] All orders load
- [ ] Status update works
- [ ] Order details view
- [ ] Customer info visible
- [ ] Payment status shown

#### **13. Users** (/admin/users)
- [ ] User list loads
- [ ] Role change works
- [ ] Block/unblock works
- [ ] Activity logs visible
- [ ] RBAC enforced

#### **14. Coupons** (/admin/coupons) ⚠️ **CRITICAL TEST**
- [ ] Coupon list loads ⚠️ **PREVIOUSLY BROKEN**
- [ ] Create coupon works
- [ ] Edit coupon works
- [ ] Toggle active/inactive
- [ ] Usage statistics correct
- [ ] Progress bars display

---

### **PHASE 4: GROWTH FEATURES** 🚀

#### **15. Reviews System**
- [ ] Can write review (if purchased)
- [ ] Star rating works
- [ ] Comment validation
- [ ] Photo upload (if implemented)
- [ ] Reviews display on product
- [ ] Average rating calculated
- [ ] Admin can delete reviews

#### **16. Coupon System** ⭐ **FOCUS AREA**
- [ ] Admin can create coupon
- [ ] Customer can apply coupon
- [ ] Discount calculated correctly
- [ ] Validation rules work:
  - [ ] Minimum order
  - [ ] Expiration check
  - [ ] Usage limit
  - [ ] One per user
- [ ] Remove coupon works
- [ ] Final amount updates in checkout

#### **17. Referral System**
- [ ] Referral code on signup
- [ ] Code saved to profile
- [ ] Reward triggered on first order
- [ ] Wallet credited correctly
- [ ] Stats available via API

---

### **PHASE 5: SECURITY INFRASTRUCTURE** 🛡️

#### **18. Authentication & Authorization**
- [ ] Login required for protected routes
- [ ] Admin routes protected
- [ ] Role-based access works
- [ ] Self-promotion prevented
- [ ] Hierarchical control

#### **19. Audit Logging** ⚠️ **RECENTLY FIXED**
- [ ] Security events logged
- [ ] Admin actions logged
- [ ] Payment events logged
- [ ] No undefined field errors
- [ ] Console logs visible
- [ ] Firestore writes successful

#### **20. Rate Limiting**
- [ ] 20 req/min default
- [ ] Failed login tracking
- [ ] Auto-block after 5 failures
- [ ] Redis integration working
- [ ] Blocklist enforcement

#### **21. Security Dashboard** (/admin/security)
- [ ] Logs display correctly
- [ ] Blocked IPs tab works
- [ ] Manual unblock works
- [ ] Activity feed shows events
- [ ] Stats accurate

---

## 🎯 CRITICAL TEST SCENARIOS

### **Scenario 1: Complete Purchase Flow** ⭐⭐⭐
```
1. Browse homepage
2. View product
3. Select size
4. Add to cart
5. Apply coupon (SAVE20)
6. Update quantity
7. Proceed to checkout
8. Login/signup
9. Complete address
10. Razorpay payment
11. Order confirmation
12. Check order in /orders
```

**Expected Result:** Order created with discount applied, stock reduced

---

### **Scenario 2: Admin Coupon Management** ⭐⭐⭐
```
1. Login as superadmin
2. Navigate to /admin/coupons
3. Click "Create Coupon"
4. Fill form:
   - Code: TEST50
   - Type: Fixed
   - Value: ₹50
   - Min Order: ₹500
   - Usage Limit: 10
5. Save coupon
6. Verify appears in list
7. Toggle inactive
8. Toggle active again
9. Edit usage limit
10. Logout
```

**Expected Result:** Coupon created and manageable

---

### **Scenario 3: Customer Applies Coupon** ⭐⭐⭐
```
1. Add items worth ₹1000
2. Go to cart
3. Enter code: TEST50
4. Click Apply
5. Verify discount: ₹50
6. Verify final: ₹950
7. Click Remove
8. Verify back to ₹1000
9. Re-apply code
10. Proceed to checkout
```

**Expected Result:** Discount works and persists through checkout

---

### **Scenario 4: Review Submission** ⭐⭐
```
1. Purchase product (test order)
2. Visit product page
3. Click "Write Review"
4. Fill form:
   - Rating: 5 stars
   - Comment: "Great product!"
   - Upload image (optional)
5. Submit review
6. Verify appears on page
7. Check average rating updated
8. Admin deletes review
9. Verify removed from page
```

**Expected Result:** Verified purchase review system working

---

### **Scenario 5: RBAC Enforcement** ⭐⭐
```
1. Login as customer
2. Try accessing /admin → Denied
3. Try accessing /admin/coupons → Denied
4. Login as admin
5. Access /admin → Allowed
6. Try changing own role → Denied
7. Login as superadmin
8. Change admin to superadmin → Allowed
9. Block user → Success
```

**Expected Result:** Role boundaries strictly enforced

---

### **Scenario 6: Security Event Logging** ⭐
```
1. Perform admin action (create product)
2. Check /admin/security logs
3. Verify event recorded
4. Fail login 5 times
5. Check blocklist
6. Verify IP blocked
7. Wait for expiry or manually unblock
8. Verify unblocked
```

**Expected Result:** All security events tracked and actionable

---

## 🔍 KNOWN AREAS TO VERIFY

### **Previously Fixed Bugs:**

1. **Logger Undefined Fields** ✅
   - Test: Create coupon, check logs
   - Expected: No Firestore crashes

2. **Coupon API Path** ✅
   - Test: Visit /admin/coupons
   - Expected: Loads without "Failed to load" error

3. **auditLog Function** ✅
   - Test: Create Razorpay order
   - Expected: No "not a function" error

4. **Cart SKU Consistency** ✅
   - Test: Add multiple sizes to cart
   - Expected: Each tracked separately

---

## 📊 TEST EXECUTION TRACKING

### **Priority Levels:**

**P0 (Critical - Must Pass):**
- Homepage loads
- Product browsing works
- Cart operations work
- Coupon application works
- Payment processing works
- Admin panel accessible

**P1 (High - Should Pass):**
- Reviews work
- Admin CRUD operations
- RBAC enforcement
- Security logging

**P2 (Medium - Nice to Have):**
- Referral rewards
- Advanced analytics
- Bulk operations

---

## 🐛 ERROR TRACKING

### **If Tests Fail:**

Document:
1. **Step where failure occurred**
2. **Error message (exact text)**
3. **Console errors (screenshots)**
4. **Network tab response**
5. **Expected vs actual behavior**

---

## ✅ SUCCESS CRITERIA

**Platform is Production Ready when:**
- ✅ All P0 tests pass
- ✅ No console errors on critical paths
- ✅ Payment flow completes successfully
- ✅ Admin can manage all features
- ✅ Security logging functional
- ✅ Coupon system end-to-end working

---

## 📝 TEST RESULTS TEMPLATE

```
TEST CATEGORY: [Name]
STATUS: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

Steps Tested:
1. [Step] - Result
2. [Step] - Result

Issues Found:
- [Description]

Fixes Applied:
- [What was done]

Retest Status: ✅ PASS
```

---

**Ready to begin systematic testing!**
