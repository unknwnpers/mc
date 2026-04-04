/**
 * Excel Import Utility
 * Follows minimal-field principle: only repeatable + structured data
 * Includes fuzzy category mapping for production-grade robustness
 */

import * as XLSX from 'xlsx';
import { PRODUCT_CATEGORIES } from './constants';

export interface ExcelRow {
  'Product Name': string;
  'Category': string;
  'Size': string;
  'Price': number;
  'Stock': number;
  'Image URL'?: string;
}

export interface ParsedProduct {
  name: string;
  category_slug: string;
  imageUrl?: string;
  variants: {
    size: string;
    price: number;
    stock: number;
    sku: string;
  }[];
}

export interface DuplicateEntry {
  productName: string;
  size: string;
  rows: number[];
  prices: number[];
  stocks: number[];
  hasPriceConflict: boolean;
}

export interface SizeIssue {
  row: number;
  productName: string;
  category: string;
  size: string;
  validSizes: string[];
  suggestedFix?: string;
}

export interface ImportResult {
  success: boolean;
  products: ParsedProduct[];
  duplicates: DuplicateEntry[];
  sizeIssues: SizeIssue[];
  errors: string[];
  warnings: string[];
  totalVariants: number;
}

// Fuzzy category mapping rules - STRICT keywords only
// NO generic words like "shirt", "dress", "wear"
const CATEGORY_RULES = [
  {
    value: "feeding-nursing",
    keywords: ["feeding", "nursing", "lactation"]
  },
  {
    value: "maternity-wear",
    keywords: ["maternity", "pregnancy", "pregnant"]
  },
  {
    value: "kids-clothing",
    keywords: ["kids", "kid", "toddler"]
  },
  {
    value: "baby-essentials",
    keywords: ["baby", "newborn", "infant"]
  },
  {
    value: "accessories",
    keywords: ["socks", "cap", "caps", "mittens", "bib", "bibs"]
  }
];

// MASTER ALLOWED SIZES - Clean, minimal, production-grade
// These are the ONLY sizes that can exist in the database
const ALLOWED_SIZES = [
  // Maternity
  "S", "M", "L", "XL",
  // Kids
  "1-2Y", "2-3Y", "3-4Y", "4-5Y",
  // Baby
  "0-3M", "3-6M", "6-9M", "9-12M",
  // Universal
  "Free Size"
] as const;

// Category-specific size mapping
// Input (extracted) → Output (allowed size for category)
const CATEGORY_SIZE_MAP: Record<string, Record<string, string>> = {
  "maternity-wear": {
    "S": "S",
    "M": "M",
    "L": "L",
    "XL": "XL",
    "FREE": "Free Size",
    "FREESIZE": "Free Size"
  },
  "kids-clothing": {
    "S": "1-2Y",
    "M": "2-3Y",
    "L": "3-4Y",
    "XL": "4-5Y",
    "1-2Y": "1-2Y",
    "2-3Y": "2-3Y",
    "3-4Y": "3-4Y",
    "4-5Y": "4-5Y",
    "FREE": "Free Size",
    "FREESIZE": "Free Size"
  },
  "baby-essentials": {
    "S": "0-3M",
    "M": "3-6M",
    "L": "6-9M",
    "XL": "9-12M",
    "0-3M": "0-3M",
    "3-6M": "3-6M",
    "6-9M": "6-9M",
    "9-12M": "9-12M",
    "FREE": "Free Size",
    "FREESIZE": "Free Size"
  },
  "feeding-nursing": {
    "S": "S",
    "M": "M",
    "L": "L",
    "XL": "XL",
    "FREE": "Free Size",
    "FREESIZE": "Free Size"
  },
  "accessories": {
    "FREE": "Free Size",
    "FREESIZE": "Free Size"
  }
};

// Valid sizes per category (for validation)
const CATEGORY_SIZE_RULES: Record<string, string[]> = {
  "maternity-wear": ["S", "M", "L", "XL", "Free Size"],
  "kids-clothing": ["1-2Y", "2-3Y", "3-4Y", "4-5Y", "Free Size"],
  "baby-essentials": ["0-3M", "3-6M", "6-9M", "9-12M", "Free Size"],
  "feeding-nursing": ["S", "M", "L", "XL", "Free Size"],
  "accessories": ["Free Size"]
};

const ALLOWED_CATEGORIES = Object.keys(PRODUCT_CATEGORIES);

/**
 * Clean and normalize input text
 */
function clean(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Match category using keyword rules
 */
function matchCategory(text: string): { slug: string; matched: string } | null {
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        return { slug: rule.value, matched: keyword };
      }
    }
  }
  return null;
}

/**
 * Universal size normalization - Step 1
 * Cleans raw input from Excel
 */
function normalizeRawSize(input: string): string {
  return input
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9- ]/g, "")  // remove special chars
    .replace(/\s+/g, "");          // remove all spaces
}

/**
 * Extract size pattern - Step 2
 * Examples: "ORGANICC-M" → "M", "size 2-3Y" → "2-3Y"
 */
function extractSizePattern(input: string): string | null {
  const text = normalizeRawSize(input);
  
  const patterns = [
    /(XXL|XL|L|M|S|XS)/,           // standard sizes (XXL before XL!)
    /(\d+-\d+Y)/,                  // 1-2Y, 2-3Y, etc.
    /(\d+-\d+M)/,                  // 0-3M, 3-6M, etc.
    /(FREESIZE|FREE)/              // free size variants
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return null;
}

/**
 * Map size to category - Step 3
 * Universal → Category-specific
 */
function mapSizeToCategory(category: string, rawSize: string): { 
  size: string; 
  wasMapped: boolean;
  original: string;
} {
  const extracted = extractSizePattern(rawSize);
  
  if (!extracted) {
    throw new Error(`Cannot extract size from: "${rawSize}"`);
  }
  
  const categoryMap = CATEGORY_SIZE_MAP[category];
  if (!categoryMap) {
    // Unknown category, return extracted as-is
    return { size: extracted, wasMapped: false, original: rawSize };
  }
  
  if (categoryMap[extracted]) {
    const mappedSize = categoryMap[extracted];
    return { 
      size: mappedSize, 
      wasMapped: extracted !== mappedSize,
      original: extracted
    };
  }
  
  // Size not in category map - return extracted but mark as invalid
  return { size: extracted, wasMapped: false, original: extracted };
}

/**
 * Validate size against master allowed list
 * HARD VALIDATION - only these sizes can exist in DB
 */
function validateMasterSize(size: string): boolean {
  return ALLOWED_SIZES.includes(size as any);
}

/**
 * Validate size against category rules
 */
function validateSize(category: string, size: string): boolean {
  // First check master allowed list
  if (!validateMasterSize(size)) {
    return false;
  }
  
  // Then check category-specific rules
  const validSizes = CATEGORY_SIZE_RULES[category];
  if (!validSizes) return true;
  return validSizes.includes(size);
}

/**
 * Full size processing pipeline
 * Raw → Universal → Category → Validate
 */
function processSize(category: string, rawSize: string): {
  size: string;
  wasMapped: boolean;
  original: string;
  isValid: boolean;
} {
  const mapped = mapSizeToCategory(category, rawSize);
  const isValid = validateSize(category, mapped.size);
  
  return {
    size: mapped.size,
    wasMapped: mapped.wasMapped,
    original: mapped.original,
    isValid
  };
}

/**
 * Merge variants by size
 * - Latest price wins
 * - Stock sums
 */
function mergeVariants(rows: Array<{ size: string; price: number; stock: number; rowNum: number }>): Array<{ size: string; price: number; stock: number; merged: boolean; count: number }> {
  const map = new Map<string, { size: string; price: number; stock: number; merged: boolean; count: number }>();

  for (const row of rows) {
    if (!row.size) continue;

    if (map.has(row.size)) {
      const existing = map.get(row.size)!;
      // Merge: latest price wins, stock sums
      map.set(row.size, {
        size: row.size,
        price: row.price,      // Latest price wins
        stock: existing.stock + row.stock,  // Stock sums
        merged: true,
        count: existing.count + 1
      });
    } else {
      map.set(row.size, {
        size: row.size,
        price: row.price,
        stock: row.stock,
        merged: false,
        count: 1
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Normalize category using PRIORITY-BASED matching
 * STEP 1: Try category column ONLY (user intent)
 * STEP 2: Fallback to product name ONLY
 * Returns matched category slug or null if no match
 */
function normalizeCategory(categoryInput: string, productName: string): { slug: string; matched: string; source: 'category' | 'product' } | null {
  const categoryClean = clean(categoryInput);
  const productClean = clean(productName);
  
  // STEP 1: Try exact match on category slug
  const exactMatch = ALLOWED_CATEGORIES.find(cat => cat === categoryClean.replace(/ /g, "-"));
  if (exactMatch) {
    return { slug: exactMatch, matched: categoryInput, source: 'category' };
  }
  
  // STEP 2: Try fuzzy match on CATEGORY ONLY (priority - user intent)
  const categoryMatch = matchCategory(categoryClean);
  if (categoryMatch) {
    return { ...categoryMatch, source: 'category' };
  }
  
  // STEP 3: Fallback to product name ONLY
  const productMatch = matchCategory(productClean);
  if (productMatch) {
    return { ...productMatch, source: 'product' };
  }
  
  return null;
}

/**
 * Get all valid category suggestions for error messages
 */
function getCategorySuggestions(): string {
  return CATEGORY_RULES.map(r => `${r.value} (${r.keywords.slice(0, 3).join(", ")}...)`).join(" | ");
}

/**
 * Validate and parse Excel file
 */
export function parseExcelFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve({ success: false, products: [], duplicates: [], sizeIssues: [], errors: ['Failed to read file'], warnings: [], totalVariants: 0 });
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        const result = validateAndParse(jsonData);
        resolve(result);
      } catch (error) {
        resolve({ 
          success: false, 
          products: [], 
          duplicates: [],
          sizeIssues: [],
          errors: [`Parse error: ${error}`], 
          warnings: [],
          totalVariants: 0
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, products: [], duplicates: [], sizeIssues: [], errors: ['File read error'], warnings: [], totalVariants: 0 });
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Detect duplicate entries in rows
 * Uses normalized sizes for accurate duplicate detection
 */
function detectDuplicates(rows: ExcelRow[]): DuplicateEntry[] {
  const duplicateMap = new Map<string, DuplicateEntry>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (1-based + header)
    const name = row['Product Name']?.trim();
    const rawSize = row['Size']?.trim();
    
    if (!name || !rawSize) return;
    
    // Extract size pattern for duplicate detection (category-agnostic)
    const extractedPattern = extractSizePattern(rawSize);
    if (!extractedPattern) return; // Skip unextractable sizes
    
    const key = `${name}_${extractedPattern}`;
    const price = Number(row['Price']) || 0;
    const stock = Number(row['Stock']) || 0;

    if (duplicateMap.has(key)) {
      const entry = duplicateMap.get(key)!;
      entry.rows.push(rowNum);
      entry.prices.push(price);
      entry.stocks.push(stock);
      entry.hasPriceConflict = entry.hasPriceConflict || !entry.prices.every(p => p === price);
    } else {
      duplicateMap.set(key, {
        productName: name,
        size: extractedPattern, // Store extracted pattern
        rows: [rowNum],
        prices: [price],
        stocks: [stock],
        hasPriceConflict: false
      });
    }
  });

  // Return only actual duplicates (rows.length > 1)
  return Array.from(duplicateMap.values()).filter(d => d.rows.length > 1);
}

/**
 * Validate rows and group into products
 * PRODUCTION-GRADE: Merges duplicates, latest price wins, stock sums
 */
function validateAndParse(rows: ExcelRow[]): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Collect size issues for user confirmation
  const sizeIssues: SizeIssue[] = [];
  
  // Step 1: Group all valid rows by product name
  const productGroups = new Map<string, Array<{
    rowNum: number;
    name: string;
    category_slug: string;
    size: string;
    price: number;
    stock: number;
    imageUrl?: string;
    wasMapped: boolean;
    originalSize: string;
    categorySource: 'category' | 'product';
  }>>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel row number (1-based + header)

    // Required field validation
    if (!row['Product Name']?.trim()) {
      errors.push(`Row ${rowNum}: Product Name is required`);
      return;
    }

    if (!row['Category']?.trim()) {
      errors.push(`Row ${rowNum}: Category is required`);
      return;
    }

    if (!row['Size']?.trim()) {
      errors.push(`Row ${rowNum}: Size is required`);
      return;
    }

    if (row['Price'] === undefined || row['Price'] === null) {
      errors.push(`Row ${rowNum}: Price is required`);
      return;
    }

    if (row['Stock'] === undefined || row['Stock'] === null) {
      errors.push(`Row ${rowNum}: Stock is required`);
      return;
    }

    // Validate product name
    const name = row['Product Name'].trim();
    if (name.length < 3) {
      errors.push(`Row ${rowNum}: Product Name must be at least 3 characters`);
      return;
    }

    // Validate category
    const categoryResult = normalizeCategory(row['Category'], name);
    if (!categoryResult) {
      errors.push(`Row ${rowNum}: Invalid category "${row['Category']}" for product "${name}". Try: ${getCategorySuggestions()}`);
      return;
    }
    const category_slug = categoryResult.slug;

    // Validate price
    const price = Number(row['Price']);
    if (isNaN(price) || price <= 0) {
      errors.push(`Row ${rowNum}: Price must be greater than 0`);
      return;
    }

    // Validate stock
    const stock = Number(row['Stock']);
    if (isNaN(stock) || stock < 0) {
      errors.push(`Row ${rowNum}: Stock must be 0 or greater`);
      return;
    }

    // Process size
    let sizeResult: ReturnType<typeof processSize>;
    try {
      sizeResult = processSize(category_slug, row['Size']);
    } catch (error: any) {
      errors.push(`Row ${rowNum}: Invalid size "${row['Size']}". Expected formats: S, M, L, 0-3M, 2-3Y, Free Size`);
      return;
    }

    // Check size validity
    if (!sizeResult.isValid) {
      const validSizes = CATEGORY_SIZE_RULES[category_slug] || [];
      const categoryMap = CATEGORY_SIZE_MAP[category_slug];
      const suggestedFix = categoryMap?.[sizeResult.original];
      
      sizeIssues.push({
        row: rowNum,
        productName: name,
        category: category_slug,
        size: sizeResult.size,
        validSizes,
        suggestedFix
      });
      return;
    }

    // Add to product group
    if (!productGroups.has(name)) {
      productGroups.set(name, []);
    }
    
    productGroups.get(name)!.push({
      rowNum,
      name,
      category_slug,
      size: sizeResult.size,
      price,
      stock,
      imageUrl: row['Image URL']?.trim() || undefined,
      wasMapped: sizeResult.wasMapped,
      originalSize: sizeResult.original,
      categorySource: categoryResult.source
    });

    // Add warnings
    if (categoryResult.source === 'product') {
      warnings.push(`Row ${rowNum}: Category "${row['Category']}" unclear, used product name → "${category_slug}"`);
    }
    if (sizeResult.wasMapped) {
      warnings.push(`Row ${rowNum}: Size "${sizeResult.original}" mapped to "${sizeResult.size}" for ${category_slug}`);
    }
  });

  // Step 2: Merge variants within each product
  const productMap = new Map<string, ParsedProduct>();
  const duplicateEntries: DuplicateEntry[] = [];

  productGroups.forEach((rows, productName) => {
    // Get product metadata from first row
    const firstRow = rows[0];
    const category_slug = firstRow.category_slug;
    const imageUrl = firstRow.imageUrl;

    // Merge variants by size
    const mergedVariants = mergeVariants(rows.map(r => ({
      size: r.size,
      price: r.price,
      stock: r.stock,
      rowNum: r.rowNum
    })));

    // Track duplicates for UI
    mergedVariants.forEach(v => {
      if (v.merged) {
        // Find all rows that contributed to this merged variant
        const contributingRows = rows
          .filter(r => r.size === v.size)
          .map(r => r.rowNum);
        
        duplicateEntries.push({
          productName,
          size: v.size,
          rows: contributingRows,
          prices: rows.filter(r => r.size === v.size).map(r => r.price),
          stocks: rows.filter(r => r.size === v.size).map(r => r.stock),
          hasPriceConflict: false // Price conflict handled by latest wins
        });

        warnings.push(`Product "${productName}": Merged ${v.count} entries for size "${v.size}" → Price: ₹${v.price}, Stock: ${v.stock}`);
      }
    });

    // Build final product
    const variants = mergedVariants.map(v => ({
      size: v.size,
      price: v.price,
      stock: v.stock,
      sku: generateSKU(productName, v.size)
    }));

    productMap.set(productName, {
      name: productName,
      category_slug,
      imageUrl,
      variants
    });
  });

  // Warnings for products without images
  productMap.forEach((product) => {
    if (!product.imageUrl) {
      warnings.push(`Product "${product.name}" has no image URL`);
    }
  });

  // Success if no errors (duplicates and size issues don't block - they show confirmation)
  const success = errors.length === 0;
  const products = Array.from(productMap.values());
  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);

  return {
    success,
    products,
    duplicates: duplicateEntries,
    sizeIssues,
    errors,
    warnings,
    totalVariants
  };
}

/**
 * Generate SKU from product name and size
 */
function generateSKU(name: string, size: string): string {
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  const sizePart = size
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return `${namePart}-${sizePart}`;
}

/**
 * Generate slug from product name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}
