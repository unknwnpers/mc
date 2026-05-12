# Implementation Plan - Refactor Orders Navigation & Redesign Cart

Consolidate orders navigation into the profile page and redesign the cart page to align with the project's premium UI/UX (consistent with the profile and order detail pages).

## Proposed Changes

### Refactor Orders Navigation

#### [Navbar.tsx](file:///C:/Users/hitec/own/project1/mc/components/Navbar.tsx)
- Update "My Orders" link in desktop account dropdown from `/orders` to `/profile?tab=orders`.
- Update "My Orders" link in mobile drawer from `/orders` to `/profile?tab=orders`.
- Update "Orders" link in mobile bottom bar from `/orders` to `/profile?tab=orders`.

#### [Footer.tsx](file:///C:/Users/hitec/own/project1/mc/components/Footer.tsx)
- Update "Track Order" link in `customerCare` array from `/orders` to `/profile?tab=orders`.

#### [orders/[id]/page.tsx](file:///C:/Users/hitec/own/project1/mc/app/orders/[id]/page.tsx)
- Update "Back to Orders" link from `/orders` to `/profile?tab=orders`.
- Update `router.push("/orders")` calls in `fetchOrder` error handling to `router.push("/profile?tab=orders")`.

---

### Redesign Cart Page

#### [cart/page.tsx](file:///C:/Users/hitec/own/project1/mc/app/cart/page.tsx)
- **Layout & Background**: Change background to `#FCF9F7` (matching Profile page).
- **Typography**:
    - Use `font-serif` for main headings.
    - Use bold uppercase tracking for small labels (e.g., "Size", "Qty", "Delivery Address").
- **Item Cards**:
    - Update styling to match the profile page's "recent orders" widget.
    - Use `rounded-[40px]`, `border-[#F3E8E5]`, and soft shadows.
- **Summary Section**:
    - Enhance the "Order Summary" box with premium borders and shadows.
    - Use `bg-charcoal` for the main CTA button if not already.
- **Empty State**:
    - Refine the empty cart design to be more elegant.

## Verification Plan

### Manual Verification
- **Navigation**:
    - Verify all "Orders" links (Navbar desktop/mobile, Footer, Order Detail) navigate to the profile's Orders tab.
- **Cart Redesign**:
    - Visual inspection of the cart page to ensure it matches the `profile/page.tsx` aesthetics (colors, rounded corners, shadows, typography).
    - Verify checkout flow still works with the new design.
