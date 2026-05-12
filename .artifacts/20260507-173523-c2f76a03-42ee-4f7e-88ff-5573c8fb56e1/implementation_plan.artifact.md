# Implementation Plan - Profile Page Overhaul

Overhaul the profile page to match the "Soft Luxury" boutique aesthetic shown in the design image. The goal is to transition from a generic two-column layout to a sophisticated three-column, tabbed interface.

## User Review Required

> [!NOTE]
> The profile editing functionality will move from an always-visible form to a modal or a separate tab to match the clean "read-only" look of the design image.

## Proposed Changes

### Profile Component (`app/profile/page.tsx`)

#### [app/profile/page.tsx](file:///C:/Users/hitec/own/project1/mc/app/profile/page.tsx)

- **Layout Update:** Implement a three-column grid layout on desktop:
    - Left Column: Profile Summary & Sidebar.
    - Middle Column: Main Content with Tab Navigation.
    - Right Column: Account Tips & Priority Widgets.
- **Tab System:** Add a local state `activeTab` ('profile', 'orders', 'wishlist', 'addresses').
- **Data Integration:**
    - Fetch "Recent Orders" (latest 1-2 orders) for the dashboard view.
    - Integrate existing favorites/wishlist data.
    - Integrate existing saved addresses.
- **Visual Improvements:**
    - Use `#FCF9F7` background.
    - Apply rounded corners (`rounded-[40px]`) and soft shadows.
    - Implement a "Verified" badge for the user avatar and mobile number.
    - Style the "Recent Orders" and "Wishlist" preview cards to be highly visual (with images).
- **Functionality Retention:** Ensure profile updates, address management, and favorite removal continue to work seamlessly via the existing Firebase/API logic.

---

### UI Components

#### [NEW] Account Widgets
- Create `AccountTips` and `YourPriority` static components/sections within the profile page to match the design.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no JSX/TypeScript regressions.

### Manual Verification
- **Layout Check:** Verify three-column layout on desktop and single-column on mobile.
- **Tab Navigation:** Switch between tabs and ensure correct content is displayed.
- **Data Accuracy:** Confirm that user profile, recent orders, and wishlist items are correctly fetched and rendered.
- **Functionality:** Edit an address, remove a favorite, and update profile info to ensure no breakage.
