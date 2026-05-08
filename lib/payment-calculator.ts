/**
 * Payment Calculation Utility — Indian/Kerala 2026 Ecommerce Standard
 *
 * KEY RULES (Canonical — All calculations happen in backend):
 * 1. MRP is INCLUSIVE of GST. DO NOT add separate GST/IGST rows.
 * 2. Selling price is derived by applying a discount % on MRP.
 * 3. Platform Fee = 2% of selling price (Prepaid), 3% (COD).
 * 4. COD Charge = 8% of selling price (COD only).
 * 5. Shipping is FREE on all orders.
 *
 * Prepaid example (MRP ₹499, 25% discount):
 *   sellingPrice = roundUp(499 − 25%) = 375
 *   platformFee  = round(375 × 0.02) = ₹8
 *   total        = 375 + 8 = ₹383
 *
 * COD example (same product):
 *   sellingPrice = ₹375
 *   platformFee  = round(375 × 0.03) = ₹11
 *   codCharge    = round(375 × 0.08) = ₹30
 *   total        = 375 + 11 + 30 = ₹416
 */

// ─── Fee Rate Constants ──────────────────────────────────────────────
const PLATFORM_FEE_RATE_PREPAID = 0.02; // 2% of selling price
const PLATFORM_FEE_RATE_COD     = 0.03; // 3% of selling price
const COD_CHARGE_RATE           = 0.08; // 8% of selling price
const SHIPPING_FEE              = 0;    // Always FREE

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The canonical cart pricing response.
 * Frontend must render ONLY these fields — no client-side recalculation allowed.
 */
export interface PaymentBreakdown {
  /** Sum of (sellingPrice × quantity) for all items */
  subtotal:      number;
  /** Total MRP before discount (informational) */
  mrpTotal:      number;
  /** Total discount amount applied (mrpTotal - subtotal) */
  discountAmount: number;
  /** Platform operational fee (2% prepaid / 3% COD) */
  platformFee:   number;
  /** COD-specific charge (8% of selling price) */
  codCharge:     number;
  /** Shipping fee (₹0 = FREE) */
  shippingFee:   number;
  /** Human-readable shipping label */
  shippingLabel: string;
  /** Grand total the customer pays */
  totalAmount:   number;
  /** GST is included in MRP */
  taxIncluded:   true;
  currency:      "INR";
  /** Additional coupon discount */
  couponDiscount?: number;
}

export interface CalculationParams {
  /** Sum of (sellingPrice × quantity) for all cart items */
  subtotal:       number;
  /** Sum of (mrpPrice × quantity) for all cart items */
  mrpTotal?:      number;
  /** Additional coupon discount amount (server-validated) */
  couponDiscount?: number;
  isCOD?:         boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round to nearest rupee (standard rounding).
 */
function roundRupee(n: number): number {
  return Math.round(n);
}

/**
 * Round UP to nearest rupee (standard for selling prices in this project).
 */
function roundUpRupee(n: number): number {
  return Math.ceil(n);
}

/**
 * Calculate sellingPrice from MRP and discount percent.
 * MRP - discount% rounded UP.
 *
 * Formula: sellingPrice = round(mrp - (mrp * discountPercent / 100))
 * Note: To match the 499 - 25% = 375 example, we use Math.ceil.
 */
export function calculateSellingPrice(mrp: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error(`Invalid discount percent: ${discountPercent}. Must be 0–100.`);
  }
  return roundUpRupee(mrp * (1 - discountPercent / 100));
}

/**
 * Calculate discount amount from MRP and discount percent.
 */
export function calculateDiscountAmount(mrp: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error(`Invalid discount percent: ${discountPercent}. Must be 0–100.`);
  }
  const sellingPrice = calculateSellingPrice(mrp, discountPercent);
  return Math.max(0, mrp - sellingPrice);
}

// ─── Main Calculator ──────────────────────────────────────────────────────────

/**
 * Main server-side payment breakdown calculator.
 */
export function calculatePaymentBreakdown(params: CalculationParams): PaymentBreakdown {
  const {
    subtotal,
    mrpTotal        = subtotal,
    couponDiscount  = 0,
    isCOD           = false,
  } = params;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!isFinite(subtotal) || subtotal < 0) {
    throw new Error(`Invalid subtotal: ${subtotal}`);
  }
  if (!isFinite(mrpTotal) || mrpTotal < 0) {
    throw new Error(`Invalid mrpTotal: ${mrpTotal}`);
  }
  if (couponDiscount < 0) {
    throw new Error(`Coupon discount cannot be negative: ${couponDiscount}`);
  }
  if (couponDiscount > subtotal) {
    throw new Error(`Coupon discount (${couponDiscount}) cannot exceed subtotal (${subtotal})`);
  }

  // ── Fee calculation (percentage-based on effective selling price) ───────────
  const effectiveSubtotal = Math.max(0, subtotal - couponDiscount);

  const platformFeeRate = isCOD ? PLATFORM_FEE_RATE_COD : PLATFORM_FEE_RATE_PREPAID;
  const platformFee     = roundRupee(effectiveSubtotal * platformFeeRate);
  const codCharge       = isCOD ? roundRupee(effectiveSubtotal * COD_CHARGE_RATE) : 0;
  const shippingFee     = SHIPPING_FEE;
  const shippingLabel   = shippingFee === 0 ? "FREE" : `₹${shippingFee}`;

  // Grand total
  const totalAmount = roundRupee(effectiveSubtotal + platformFee + codCharge + shippingFee);

  // Discount amount = MRP total minus selling price subtotal
  const discountAmount = Math.max(0, mrpTotal - subtotal);

  return {
    subtotal:        roundRupee(subtotal),
    mrpTotal:        roundRupee(mrpTotal),
    discountAmount:  roundRupee(discountAmount),
    platformFee,
    codCharge,
    shippingFee,
    shippingLabel,
    totalAmount,
    taxIncluded:     true,
    currency:        "INR",
    ...(couponDiscount > 0 && { couponDiscount: roundRupee(couponDiscount) }),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Validate that a server-recalculated breakdown matches a stored/client breakdown.
 */
export function validatePaymentBreakdown(
  stored: PaymentBreakdown,
  params: CalculationParams,
  toleranceRupees = 1
): boolean {
  try {
    const fresh = calculatePaymentBreakdown(params);
    return (
      Math.abs(stored.subtotal      - fresh.subtotal)     <= toleranceRupees &&
      Math.abs(stored.platformFee   - fresh.platformFee)  <= toleranceRupees &&
      Math.abs(stored.codCharge     - fresh.codCharge)    <= toleranceRupees &&
      Math.abs(stored.shippingFee   - fresh.shippingFee)  <= toleranceRupees &&
      Math.abs(stored.totalAmount   - fresh.totalAmount)  <= toleranceRupees
    );
  } catch {
    return false;
  }
}

/**
 * Format currency for display (Indian locale).
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Get shipping progress message.
 * Currently always FREE.
 */
export function getShippingProgress(_subtotal: number): {
  remaining:      number;
  hasFreeShipping: boolean;
  message:        string;
} {
  return {
    remaining:       0,
    hasFreeShipping: true,
    message:         "FREE Shipping on this order!",
  };
}
