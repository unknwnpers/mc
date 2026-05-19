# Audit Improvements: Accessibility, Performance, Best Practices, and SEO

This plan outlines improvements to the Miks & Chiks project across four key areas: Accessibility (a11y), Performance, Best Practices, and SEO.

## User Review Required

- **Viewport Settings**: Removing `user-scalable=false` from `app/layout.tsx`. This is generally recommended for accessibility but might slightly affect the "app-like" feel if users accidentally zoom.
- **Dynamic Rendering**: I plan to review the usage of `force-dynamic` in `app/page.tsx`. If the data doesn't change on every request, removing it will improve performance by allowing ISR.

## Proposed Changes

### Accessibility (a11y)

Improve screen reader support and keyboard navigation.

#### [layout.tsx](file:///C:/Users/hitec/own/project1/mc/app/layout.tsx)
- Remove `userScalable: false` from `viewport` to allow zooming.

#### [Navbar.tsx](file:///C:/Users/hitec/own/project1/mc/components/Navbar.tsx)
- Add `aria-label` to the search button and mobile menu toggle.
- Add `aria-haspopup="true"` and `aria-expanded` to dropdown triggers.
- Ensure all icons use `aria-hidden="true"`.

#### [BestSellers.tsx](file:///C:/Users/hitec/own/project1/mc/components/home/BestSellers.tsx)
- Add `aria-label` to horizontal scroll buttons ("Previous products", "Next products").

#### [ProductCard.tsx](file:///C:/Users/hitec/own/project1/mc/components/ProductCard.tsx)
- Add `aria-label` to "Add to Cart" button, including its state (e.g., "Adding..." when loading).
- Add descriptive text for star ratings and discount badges.

---

### Performance

Optimize image loading and data fetching.

#### [Footer.tsx](file:///C:/Users/hitec/own/project1/mc/components/Footer.tsx)
- Replace standard `img` tags with `next/image` for Instagram preview images to enable automatic optimization and lazy loading.

#### [page.tsx](file:///C:/Users/hitec/own/project1/mc/app/page.tsx)
- Evaluate and potentially remove `export const dynamic = 'force-dynamic'` to enable ISR (Incremental Static Regeneration) since `revalidate = 60` is already present.

#### [ProductCard.tsx](file:///C:/Users/hitec/own/project1/mc/components/ProductCard.tsx)
- Implement a basic caching or batching strategy for offer and review fetches to reduce the number of API calls when many cards are rendered. (Or at least add AbortControllers to prevent memory leaks/race conditions).

---

### Best Practices

Code cleanup and better error handling.

#### [Footer.tsx](file:///C:/Users/hitec/own/project1/mc/components/Footer.tsx)
- Remove unused `socials` constant.

#### [Navbar.tsx](file:///C:/Users/hitec/own/project1/mc/components/Navbar.tsx)
- Fix empty `catch` blocks in `fetchLogo`.

#### General
- Audit and fix other empty `catch` blocks found during implementation.

---

### SEO

Improve metadata and image descriptions.

#### [Footer.tsx](file:///C:/Users/hitec/own/project1/mc/components/Footer.tsx)
- Improve `alt` tags for Instagram images (currently generic "Instagram").

#### [ProductCard.tsx](file:///C:/Users/hitec/own/project1/mc/components/ProductCard.tsx)
- Ensure product images have descriptive `alt` tags (currently just `product.name`).

## Verification Plan

### Automated Tests
- Run `npm run typecheck` to ensure no regressions in TypeScript.
- Run `npm run lint` (once fixed or manually) to check for common issues.

### Manual Verification
- **Accessibility**: Use Chrome DevTools (Lighthouse) to run an Accessibility audit.
- **Performance**: Use Lighthouse to compare Performance scores before and after.
- **Visual Check**: Manually verify that the Navbar dropdowns and mobile menu still work as expected.
- **Device Test**: Check that zooming works on mobile after removing `user-scalable=false`.
