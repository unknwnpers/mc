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
