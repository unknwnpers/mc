# Rendering and FCP Optimization Plan

This plan addresses the "NO_FCP" (No First Contentful Paint) error and rendering delays identified in the Lighthouse audit.

## User Review Required

- **Auth Block Removal**: I will modify `AuthProvider` to not block rendering of its children. This might cause a brief "flash" of unauthenticated content, but it's essential for FCP.
- **FlashScreen Delay**: I will ensure `FlashScreen` doesn't block the main thread or initial paint.

## Proposed Changes

### 1. Critical Rendering (Phase 1)

#### [auth-context.tsx](file:///C:/Users/hitec/own/project1/mc/lib/auth-context.tsx)
- Ensure the `AuthProvider` ALWAYS renders `children` immediately.
- Pass the `loading` state to consumers so they can handle their own loading UI (skeletons) instead of blocking the entire app tree.

#### [layout.tsx](file:///C:/Users/hitec/own/project1/mc/app/layout.tsx)
- Move `RootInit` and `AuthProvider` to wrap only the parts of the app that need them, OR ensure they are as lightweight as possible.
- Ensure `ThemeProvider` fetches data without blocking initial paint (already doing this partially, but will review).

#### [FlashScreen.tsx](file:///C:/Users/hitec/own/project1/mc/components/FlashScreen.tsx)
- Ensure it doesn't render until after the initial paint.
- Add a tiny delay or use `requestIdleCallback` if possible to avoid blocking the main thread during hydration.

---

### 2. Page Specific Optimizations (Phase 2)

#### [page.tsx](file:///C:/Users/hitec/own/project1/mc/app/page.tsx)
- Add a `SkeletonHero` or similar placeholder in `Suspense` fallbacks if not already present. (Wait, the Hero is NOT in a Suspense, which is good for FCP).
- Review `StructuredData` to ensure it doesn't cause any runtime errors that could halt rendering.

---

### 3. Firebase Auth & Domains (Phase 3)

- **Documentation**: I will provide the list of domains that MUST be in the Firebase Console's "Authorized Domains" list to ensure local and production auth works correctly.

## Verification Plan

### Automated Tests
- `npm run build`: Already confirmed it builds successfully.

### Manual Verification
- **Lighthouse (Local)**: Run Lighthouse on a production build (`npm run start`) in Incognito mode.
- **Visual Check**: Open the site and ensure the Hero section paints immediately without a blank screen "flash".
- **Auth Check**: Ensure that even with non-blocking AuthProvider, protected routes (like /profile) still correctly redirect or show loading states.
