import LegalLayout from "@/components/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund, Return & Cancellation Policy">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            At Miks & Chiks, we aim to provide high-quality maternity and kids products. This policy outlines the conditions for cancellations, returns, and refunds.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Order Cancellation</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Orders can be cancelled within <strong>12 hours of placement</strong> or <strong>before shipment is processed</strong>, whichever is earlier.
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>To cancel, email us at <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">miksandchiks@gmail.com</a> with your Order ID</li>
            <li>Once shipped, orders <strong>cannot be cancelled</strong></li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            If cancellation is approved:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mt-2">
            <li>Refund will be processed to the original payment method</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Returns & Exchanges</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We offer a <strong>7-day return/exchange policy</strong> from the date of delivery.
          </p>
          
          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Eligible Conditions:</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Item is unused, unwashed, and in original packaging</li>
            <li>All tags, labels, and accessories are intact</li>
            <li>Return request raised within 7 days</li>
          </ul>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Damaged / Incorrect Items:</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Must be reported within <strong>48 hours of delivery</strong></li>
            <li>Photo/video proof is required</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Non-Returnable Items</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            The following items are not eligible for return or exchange (unless damaged or defective):
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Newborn essentials (for hygiene reasons)</li>
            <li>Innerwear / intimate products</li>
            <li>Custom-made or personalized products</li>
            <li>Items marked as "Final Sale"</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Return Process</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Customers must initiate a return request via email.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Approved returns may require the customer to ship the product back or use our pickup service (if available).
          </p>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Shipping Responsibility:</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>If return is due to customer preference (size issue, change of mind), return shipping cost may be borne by the customer</li>
            <li>If return is due to our error (wrong/damaged product), we will cover return shipping</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Refund Policy</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Once the returned item is received and inspected:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Refunds will be processed within <strong>5–7 business days</strong></li>
            <li>Refund will be credited to the original payment method via Razorpay</li>
          </ul>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Important Conditions:</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Original shipping charges are <strong>non-refundable</strong></li>
            <li>Cash on Delivery (if applicable) handling charges are non-refundable</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">6. Coupons & Discounts</h2>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>If a coupon or discount was applied, the refund will be based on the <strong>actual amount paid</strong>, not the original product price</li>
            <li>In case of partial returns, the coupon benefit may be adjusted proportionally</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">7. Inspection & Rejection</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All returned items undergo inspection.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Refunds may be <strong>rejected</strong> if:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Product is used, damaged, or not in original condition</li>
            <li>Missing tags or packaging</li>
            <li>Return request exceeds allowed timeframe</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            In such cases, the product may be sent back to the customer at their expense.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">8. Exchanges</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Exchanges are subject to stock availability.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            If the requested replacement item is unavailable:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mt-2">
            <li>A refund will be issued instead</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">9. Delays & Liability</h2>
          <p className="text-neutral-600 leading-relaxed">
            We are not responsible for delays caused by courier partners or unforeseen circumstances.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">10. Contact Us</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            For any return, refund, or cancellation queries:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Email: <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">miksandchiks@gmail.com</a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
