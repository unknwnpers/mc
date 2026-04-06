/**
 * Payment Calculation Utility
 * Calculates GST, shipping, handling fees, and COD charges
 * All calculations are done server-side for security
 */

export interface PaymentBreakdown {
  subtotal: number;
  shipping: number;
  handlingFee: number;
  gst: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  codCharge: number;
  discount: number;
  total: number;
}

export interface CalculationParams {
  subtotal: number;
  discount?: number;
  isCOD?: boolean;
  stateCode?: string; // For determining CGST+SGST vs IGST (same state = CGST+SGST)
  userState?: string;
  businessState?: string; // Business registered state
}

// Constants
const SHIPPING_THRESHOLD = 999; // Free shipping above ₹999
const SHIPPING_FLAT_RATE = 100; // ₹100 for orders below threshold
const HANDLING_FEE_MIN = 0;
const HANDLING_FEE_MAX = 30;
const COD_CHARGE = 50;
const GST_RATE = 0.05; // 5% GST

/**
 * Calculate shipping cost based on order value
 * Free for orders above ₹999, otherwise ₹100
 */
export function calculateShipping(subtotal: number): number {
  if (subtotal >= SHIPPING_THRESHOLD) {
    return 0;
  }
  return SHIPPING_FLAT_RATE;
}

/**
 * Calculate handling fee (progressive based on order value)
 * ₹0-30 range
 */
export function calculateHandlingFee(subtotal: number): number {
  // Progressive fee: lower for higher value orders
  if (subtotal >= 2000) return 0;
  if (subtotal >= 1000) return 10;
  if (subtotal >= 500) return 20;
  return HANDLING_FEE_MAX;
}

/**
 * Calculate GST breakdown
 * Same state: CGST 2.5% + SGST 2.5%
 * Different state: IGST 5%
 * GST is calculated on (subtotal + shipping + handling - discount)
 */
export function calculateGST(
  taxableAmount: number,
  isSameState: boolean
): { cgst: number; sgst: number; igst: number; total: number } {
  const totalGST = Math.round(taxableAmount * GST_RATE);
  
  if (isSameState) {
    // Split into CGST and SGST (2.5% each)
    const halfGST = Math.round(taxableAmount * 0.025);
    return {
      cgst: halfGST,
      sgst: halfGST,
      igst: 0,
      total: halfGST * 2,
    };
  } else {
    // IGST 5%
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGST,
      total: totalGST,
    };
  }
}

/**
 * Main payment calculation function
 * Server-side only - never trust client calculations
 */
export function calculatePaymentBreakdown(
  params: CalculationParams
): PaymentBreakdown {
  const {
    subtotal,
    discount = 0,
    isCOD = false,
    userState,
    businessState = "Karnataka", // Default business state
  } = params;

  // Validate inputs
  if (subtotal < 0) throw new Error("Subtotal cannot be negative");
  if (discount < 0) throw new Error("Discount cannot be negative");
  if (discount > subtotal) throw new Error("Discount cannot exceed subtotal");

  // Calculate base charges
  const shipping = calculateShipping(subtotal);
  const handlingFee = calculateHandlingFee(subtotal);
  
  // Determine GST type based on state
  const isSameState = userState === businessState;
  
  // Calculate taxable amount (before GST, after discount)
  const taxableAmount = Math.max(0, subtotal + shipping + handlingFee - discount);
  
  // Calculate GST
  const gst = calculateGST(taxableAmount, isSameState);
  
  // COD charge
  const codCharge = isCOD ? COD_CHARGE : 0;
  
  // Calculate final total
  const total = taxableAmount + gst.total + codCharge;

  return {
    subtotal: Math.round(subtotal),
    shipping: Math.round(shipping),
    handlingFee: Math.round(handlingFee),
    gst,
    codCharge: Math.round(codCharge),
    discount: Math.round(discount),
    total: Math.round(total),
  };
}

/**
 * Get shipping progress message
 * Shows how much more to add for free shipping
 */
export function getShippingProgress(subtotal: number): {
  remaining: number;
  hasFreeShipping: boolean;
  message: string;
} {
  if (subtotal >= SHIPPING_THRESHOLD) {
    return {
      remaining: 0,
      hasFreeShipping: true,
      message: "You got FREE shipping!",
    };
  }
  
  const remaining = SHIPPING_THRESHOLD - subtotal;
  return {
    remaining,
    hasFreeShipping: false,
    message: `Add ₹${remaining} more for FREE shipping`,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Validate payment breakdown (security check)
 * Ensures no tampering occurred
 */
export function validatePaymentBreakdown(
  breakdown: PaymentBreakdown,
  params: CalculationParams
): boolean {
  try {
    const recalculated = calculatePaymentBreakdown(params);
    
    // Allow small floating point differences
    const tolerance = 1;
    
    return (
      Math.abs(breakdown.subtotal - recalculated.subtotal) <= tolerance &&
      Math.abs(breakdown.shipping - recalculated.shipping) <= tolerance &&
      Math.abs(breakdown.handlingFee - recalculated.handlingFee) <= tolerance &&
      Math.abs(breakdown.gst.total - recalculated.gst.total) <= tolerance &&
      Math.abs(breakdown.codCharge - recalculated.codCharge) <= tolerance &&
      Math.abs(breakdown.total - recalculated.total) <= tolerance
    );
  } catch {
    return false;
  }
}
