# Implementation Plan - Dynamic Product Ratings and Reviews

Enable real-time product ratings and reviews by integrating the frontend with the existing review backend and ensuring the product schema correctly reflects these stats.

## Proposed Changes

### Backend & API

#### [api/products/route.ts](file:///C:/Users/hitec/own/project1/mc/app/api/products/route.ts)
- Update the main product listing API to include `averageRating` and `reviewCount` from the product document.
- Ensure these fields are fetched from Firestore and passed to the frontend.

#### [api/products/[id]/route.ts](file:///C:/Users/hitec/own/project1/mc/app/api/products/[id]/route.ts)
- Update the product detail API to include `averageRating` and `reviewCount`.
- Ensure the single product fetch reflects the latest rating stats.

#### [api/reviews/create/route.ts](file:///C:/Users/hitec/own/project1/mc/app/api/reviews/create/route.ts)
- Verify that the `updateProductRating` helper correctly updates the `products` collection with `averageRating` and `reviewCount` upon review submission.
- Ensure only `approved` reviews (if status exists) or all reviews are counted based on project policy. *Note: Current code counts all reviews for that product.*

### Frontend Components

#### [types.ts](file:///C:/Users/hitec/own/project1/mc/lib/types.ts)
- Update the `Product` interface to include optional `averageRating: number` and `reviewCount: number`.

#### [ProductCard.tsx](file:///C:/Users/hitec/own/project1/mc/components/ProductCard.tsx)
- Replace static rating (4.8) and review count (120) with dynamic values from the `product` prop.
- Add conditional rendering to hide the rating section if there are no reviews yet.

#### [products/[id]/page.tsx](file:///C:/Users/hitec/own/project1/mc/app/products/[id]/page.tsx)
- Ensure the product detail page correctly displays the dynamic rating stats fetched from the API.
- The reviews are already being fetched via `/api/reviews/product`, but we should ensure the summary stats match what's on the `product` object for consistency.

## Verification Plan

### Automated Tests
- No automated tests available in this environment.

### Manual Verification
1. **Mock Data Injection**: Manually update a few products in Firestore with `averageRating` and `reviewCount`.
2. **Product Card Check**: Navigate to the shop page and verify that Product Cards show the correct dynamic rating and count.
3. **Product Detail Check**: Open a product detail page and verify the summary rating matches the Firestore data.
4. **Review Submission**: Submit a review (if possible with a test account that has an order) and verify that the product rating/count updates in Firestore and on the UI after a refresh.
5. **Empty State**: Verify that products with no reviews show a "No reviews yet" or simply hide the rating stars gracefully.
