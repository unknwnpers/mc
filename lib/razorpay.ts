import Razorpay from "razorpay";

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const shouldBypass = process.env.BYPASS_RAZORPAY === "true";

  if (!keyId || !keySecret || shouldBypass) {
    // If keys are missing or bypass is explicitly set, we return null to allow simulated checkout
    console.warn("Razorpay keys missing or BYPASS_RAZORPAY is true. Checkout will proceed in BYPASS/TEST mode.");
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Process a refund for a Razorpay payment
 * @param paymentId - The Razorpay payment ID
 * @param amount - Amount to refund in paise (optional, defaults to full refund)
 * @param reason - Reason for refund
 * @returns Refund details or null if bypass mode
 */
export async function processRefund(
  paymentId: string,
  amount?: number,
  reason: string = "Order cancelled by customer"
): Promise<{ id: string; status: string; amount: number } | null> {
  const razorpay = getRazorpayClient();
  
  // If bypass mode, return mock refund
  if (!razorpay) {
    console.log("[Refund] BYPASS mode - simulating refund for payment:", paymentId);
    return {
      id: `rfd_mock_${Date.now()}`,
      status: "processed",
      amount: amount || 0,
    };
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount, // undefined means full refund
      notes: {
        reason: reason,
        source: "order_cancellation",
      },
    });

    console.log("[Refund] Successfully processed:", refund.id);
    return {
      id: refund.id as string,
      status: refund.status as string,
      amount: refund.amount as number,
    };
  } catch (error: any) {
    console.error("[Refund] Failed:", error.message);
    throw new Error(`Refund failed: ${error.message}`);
  }
}

/**
 * Fetch payment details from Razorpay to get payment ID from order ID
 */
export async function getPaymentByOrderId(
  razorpayOrderId: string
): Promise<{ paymentId: string; amount: number; status: string } | null> {
  const razorpay = getRazorpayClient();
  
  if (!razorpay) {
    return null;
  }

  try {
    const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
    
    // Find the successful payment
    const successfulPayment = payments.items?.find(
      (p: any) => p.status === "captured"
    );
    
    if (successfulPayment) {
      return {
        paymentId: successfulPayment.id as string,
        amount: successfulPayment.amount as number,
        status: successfulPayment.status as string,
      };
    }
    
    return null;
  } catch (error: any) {
    console.error("[Razorpay] Failed to fetch payments:", error.message);
    return null;
  }
}
