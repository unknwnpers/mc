/**
 * Payment Calculation Utility — Indian/Kerala 2026 Ecommerce Standard
 *
 * KEY RULES (Canonical — All calculations happen in backend):
 * 1. MRP is INCLUSIVE of GST. DO NOT add separate GST/IGST rows.
 * 2. Selling price is derived by applying a discount % on MRP.
 * 3. Convenience Fee = 2% of selling price (Prepaid), 3% (COD).
 * 4. COD Charge = 8% of selling price (COD only).
 * 5. Shipping is FREE on all orders.
 *
 * Prepaid example (MRP ₹499, 25% discount):
 *   sellingPrice = roundUp(499 − 25%) = 375
 *   convenienceFee  = round(375 × 0.02) = ₹8
 *   total        = 375 + 8 = ₹383
 *
 * COD example (same product):
 *   sellingPrice = ₹375
 *   convenienceFee  = round(375 × 0.03) = ₹11
 *   codCharge    = round(375 × 0.08) = ₹30
 *   total        = 375 + 11 + 30 = ₹416
 */

// ─── Fee Rate Constants ──────────────────────────────────────────────
const CONVENIENCE_FEE_RATE_PREPAID = 0.02; // 2% of selling price
const CONVENIENCE_FEE_RATE_COD     = 0.03; // 3% of selling price
const COD_CHARGE_RATE              = 0.08; // 8% of selling price
const SHIPPING_FEE                 = 0;    // Always FREE

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The canonical cart pricing response.
 * Frontend must render ONLY these fields — no client-side recalculation allowed.
 */
export interface PaymentBreakdown {
  /** Total MRP before any discounts (The "crossed out" price sum) */
  mrpTotal:      number;
  /** Product-level discount (mrpTotal - sum of selling prices) */
  productDiscount: number;
  /** Subtotal after product discounts but BEFORE coupons */
  subtotal:      number;
  /** Additional coupon discount */
  couponDiscount: number;
  /** Final effective subtotal (subtotal - couponDiscount) */
  effectiveSubtotal: number;
  /** Platform convenience fee (2% prepaid / 3% COD) */
  convenienceFee:   number;
  /** COD-specific charge (8% of selling price) */
  codCharge:     number;
  /** Shipping fee (₹0 = FREE) */
  shippingFee:   number;
  /** Human-readable shipping label */
  shippingLabel: string;
  /** Total amount the customer pays */
  totalAmount:   number;
  /** Total amount saved (productDiscount + couponDiscount) */
  totalSavings:  number;
  /** GST is included in MRP */
  taxIncluded:   true;
  currency:      "INR";
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
 */
export function calculateSellingPrice(mrp: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error(`Invalid discount percent: ${discountPercent}. Must be 0–100.`);
  }
  return roundUpRupee(mrp * (1 - discountPercent / 100));
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

  const effectiveCouponDiscount = Math.min(couponDiscount, subtotal);
  const productDiscount = Math.max(0, mrpTotal - subtotal);
  const effectiveSubtotal = Math.max(0, subtotal - effectiveCouponDiscount);

  // ── Fee calculation (percentage-based on effective selling price) ───────────
  const convenienceFeeRate = isCOD ? CONVENIENCE_FEE_RATE_COD : CONVENIENCE_FEE_RATE_PREPAID;
  const convenienceFee     = roundRupee(effectiveSubtotal * convenienceFeeRate);
  const codCharge          = isCOD ? roundRupee(effectiveSubtotal * COD_CHARGE_RATE) : 0;
  const shippingFee        = SHIPPING_FEE;
  const shippingLabel      = shippingFee === 0 ? "FREE" : `₹${shippingFee}`;

  // Grand total
  const totalAmount = roundRupee(effectiveSubtotal + convenienceFee + codCharge + shippingFee);

  return {
    mrpTotal:        roundRupee(mrpTotal),
    productDiscount: roundRupee(productDiscount),
    subtotal:        roundRupee(subtotal),
    couponDiscount:  roundRupee(effectiveCouponDiscount),
    effectiveSubtotal: roundRupee(effectiveSubtotal),
    convenienceFee,
    codCharge,
    shippingFee,
    shippingLabel,
    totalAmount,
    totalSavings:    roundRupee(productDiscount + effectiveCouponDiscount),
    taxIncluded:     true,
    currency:        "INR",
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Validate that a server-recalculated breakdown matches a stored/client breakdown.
 */
export function validatePaymentBreakdown(
  stored: any,
  params: CalculationParams,
  toleranceRupees = 1
): boolean {
  try {
    const fresh = calculatePaymentBreakdown(params);
    // Support both old and new field names for backward compatibility during migration
    const storedConvFee = stored.convenienceFee ?? stored.platformFee ?? 0;

    return (
      Math.abs(stored.totalAmount   - fresh.totalAmount)   <= toleranceRupees &&
      Math.abs(storedConvFee        - fresh.convenienceFee) <= toleranceRupees &&
      Math.abs(stored.codCharge     - fresh.codCharge)     <= toleranceRupees
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
