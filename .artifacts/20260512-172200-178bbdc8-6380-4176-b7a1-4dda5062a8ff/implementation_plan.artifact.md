# Profile Fetching & Review System Enhancement

Fix profile summary fetching (name, email, mobile) and implement a star/review system tailored for a "Premium Maternity & Kids" project.

## User Review Required

> [!IMPORTANT]
> - **Review Attributes**: I'm adding specific ratings for "Softness", "Quality", and "Fit" as these are critical for maternity and kids' products.
> - **Mandatory Purchase**: The review system currently requires a verified purchase. I will keep this to maintain the "Premium" nature of the brand.

## Proposed Changes

### Profile Fetching & Login Sync
Ensuring name, email, and mobile are correctly fetched and synced during login and displayed on the profile page.

#### [LoginPage.tsx](file:///C:/Users/hitec/own/project1/mc/app/login/page.tsx)
- Update `handlePhoneSuccess` to call `/api/user/create` to ensure the profile is initialized/updated with the phone number immediately after OTP verification.
- Pass the `User` object from `PhoneAuth` to `handlePhoneSuccess`.

#### [auth-context.tsx](file:///C:/Users/hitec/own/project1/mc/lib/auth-context.tsx)
- Refine `onAuthStateChanged` logic to ensure the `profile` state is immediately updated with Firebase Auth data (email, name, phone) if Firestore fields are missing, even before the Firestore write completes.

#### [ProfilePage.tsx](file:///C:/Users/hitec/own/project1/mc/app/profile/page.tsx)
- Update the "Profile Summary" UI to fallback to Firebase `user` data for display if `profile` fields (name, email, phone) are still "Not set".
- This ensures the UI is populated even if the background sync is in progress or if the user hasn't filled in manual details.

---

### Star & Review System Enhancement
Tailoring the review system for the "Premium Maternity & Kids" nature by adding specific attributes and improving the UI.

#### [ReviewForm.tsx](file:///C:/Users/hitec/own/project1/mc/components/ReviewForm.tsx)
- Add sub-rating sliders for: **Softness**, **Quality**, and **Fit**.
- Update the submission logic to include these attributes.
- (Optional/Next Step) Complete the image upload logic (currently a TODO).

#### [ReviewsDisplay.tsx](file:///C:/Users/hitec/own/project1/mc/components/ReviewsDisplay.tsx)
- Display the sub-ratings (Softness, Quality, Fit) for each review.
- Add a "Verified Mom/Parent" badge or similar "Premium" styling to the reviewer profile.

#### [route.ts (api/reviews/create)](file:///C:/Users/hitec/own/project1/mc/app/api/reviews/create/route.ts)
- Update the schema to store `attributes` (softness, quality, fit).
- Ensure average ratings for these attributes are calculated or at least stored.

---

## Verification Plan

### Automated Tests
- I will check the API endpoints using `fetch` calls in the console or temporary scripts to verify profile creation and review submission with new attributes.

### Manual Verification
1. **Profile Sync**:
   - Log in with a new Phone account.
   - Verify that the Profile page immediately shows the mobile number.
   - Verify that Name and Email can be updated and are reflected.
2. **Review System**:
   - Purchase a product (or manually add an order to Firestore).
   - Go to the product page and open the review form.
   - Verify that "Softness", "Quality", and "Fit" ratings are available.
   - Submit a review and verify it displays correctly with the new attributes.
