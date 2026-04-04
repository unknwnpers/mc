/**
 * Product category constants and configuration
 */

/**
 * Categories that typically require size selection.
 * Note: Current implementation uses variant count instead of category checks
 * for better UX. This constant is kept for future reference or special cases.
 * 
 * @deprecated Use product.variants.length > 1 instead for size selection logic
 */
export const SIZE_REQUIRED_CATEGORIES = new Set([
  "baby",
  "kids", 
  "maternity",
  "feeding"
]);

/**
 * Check if a category typically requires size selection
 * @param category - The category slug to check
 * @returns true if category is in SIZE_REQUIRED_CATEGORIES
 * @deprecated Prefer checking variants.length directly
 */
export function isSizeRequiredCategory(category: string): boolean {
  return SIZE_REQUIRED_CATEGORIES.has(category.toLowerCase());
}

/**
 * All available product categories with display names
 */
export const PRODUCT_CATEGORIES = {
  "maternity-wear": "Maternity Wear",
  "kids-clothing": "Kids Clothing",
  "baby-essentials": "Baby Essentials",
  "feeding-nursing": "Feeding & Nursing",
  "accessories": "Accessories"
} as const;

export type CategorySlug = keyof typeof PRODUCT_CATEGORIES;

/**
 * URL-friendly category slugs → DB category_slug mapping
 * This allows URLs like /products?category=newborn to map to baby-essentials
 */
export const URL_CATEGORY_MAP: Record<string, CategorySlug> = {
  // Primary URL slugs (canonical)
  "maternity-wear": "maternity-wear",
  "kids-clothing": "kids-clothing",
  "baby-essentials": "baby-essentials",
  "feeding-nursing": "feeding-nursing",
  "accessories": "accessories",
  // Alternative/legacy URL slugs
  "newborn": "baby-essentials",
  "baby": "baby-essentials",
  "kids": "kids-clothing",
  "maternity": "maternity-wear",
  "feeding": "feeding-nursing"
};

/**
 * Normalize URL category parameter to DB category_slug
 * @param urlCategory - Category from URL query param
 * @returns DB category_slug or null if invalid
 */
export function normalizeUrlCategory(urlCategory: string): CategorySlug | null {
  const normalized = URL_CATEGORY_MAP[urlCategory.toLowerCase()];
  return normalized || null;
}

/**
 * Get display name for a category slug
 * @param slug - Category slug
 * @returns Human-readable category name
 */
export function getCategoryDisplayName(slug: string): string {
  return PRODUCT_CATEGORIES[slug as CategorySlug] || slug;
}
