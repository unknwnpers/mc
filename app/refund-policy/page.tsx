import LegalLayout from "@/components/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund, Replacement & Cancellation Policy">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            At Miks &amp; Chiks, we are committed to providing quality maternity, newborn, and kids products. This policy outlines the terms related to order cancellation, replacements, and refunds in compliance with applicable Indian consumer protection and e-commerce laws.
          </p>
        </div>

        {/* 1. Order Cancellation */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Order Cancellation</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Orders may be cancelled within <strong>12 hours of placing the order</strong> or before shipment is processed, whichever is earlier.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-2">
            To request cancellation, customers must email us at:{" "}
            <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">
              hello@miksandchiks.com
            </a>
          </p>
          <p className="text-neutral-600 leading-relaxed mb-2">Please include:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Order ID</li>
            <li>Customer name</li>
            <li>Contact number</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Once an order has been shipped, cancellation requests will not be accepted.
          </p>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Approved Cancellation Refunds</h3>
          <p className="text-neutral-600 leading-relaxed mb-2">If a cancellation request is approved:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Refunds will be processed to the original payment method</li>
            <li>Refund processing may take <strong>5–7 business days</strong></li>
          </ul>
        </div>

        {/* 2. Replacement Policy */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Replacement Policy</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">We provide replacements only in the following cases:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Wrong item delivered</li>
            <li>Damaged item received</li>
            <li>Manufacturing defect in the delivered product</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Replacement requests must be raised within <strong>48 hours of delivery</strong>.
          </p>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Mandatory Proof Required</h3>
          <p className="text-neutral-600 leading-relaxed mb-2">Customers must provide:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Clear photos/videos of the product</li>
            <li>Images of packaging and shipping label</li>
            <li>Order details</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Failure to provide sufficient proof may result in rejection of the request.
          </p>
        </div>

        {/* 3. No General Return Policy */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. No General Return Policy</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">We do not accept returns for:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Change of mind</li>
            <li>Size or fit issues</li>
            <li>Color or design preference</li>
            <li>Incorrect product selection by the customer</li>
            <li>Minor color variations caused by lighting, photography, or screen display differences</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Products once sold are non-returnable except in cases specifically covered under the Replacement Policy.
          </p>
        </div>

        {/* 4. Non-Replaceable Products */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Non-Replaceable Products</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">
            The following products are not eligible for replacement unless received damaged, defective, or incorrect:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Newborn essentials</li>
            <li>Innerwear / intimate wear</li>
            <li>Personalized or custom-made products</li>
            <li>Products marked as &quot;Final Sale&quot;</li>
          </ul>
        </div>

        {/* 5. Replacement Process */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Replacement Process</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">
            Approved replacement requests may be resolved through:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Reverse pickup arranged by us, or</li>
            <li>Self-shipping by the customer if pickup service is unavailable in the area</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Customers must not return products without prior approval from our support team.
          </p>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Shipping Responsibility</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>If the issue is due to our error (wrong/damaged/defective item), replacement shipping costs will be borne by us.</li>
            <li>Unauthorized or unapproved returns may be refused.</li>
          </ul>
        </div>

        {/* 6. Refund Policy */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">6. Refund Policy</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">Refunds will be provided only under the following situations:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Approved cancellation before shipment</li>
            <li>Replacement product unavailable due to stock limitations</li>
            <li>Order cannot be fulfilled by us</li>
            <li>Other situations where refund is determined appropriate under applicable consumer protection laws</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed mb-2">Where applicable:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Refunds will be processed within <strong>5–7 business days</strong></li>
            <li>Refunds will be credited to the original payment method via Razorpay or the original payment gateway used</li>
          </ul>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Non-Refundable Charges</h3>
          <p className="text-neutral-600 leading-relaxed mb-2">The following charges are non-refundable:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Original shipping charges</li>
            <li>Cash on Delivery handling charges (if applicable)</li>
          </ul>
        </div>

        {/* 7. Inspection & Rejection */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">7. Inspection &amp; Rejection</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All replacement requests are subject to inspection and verification.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-2">Requests may be rejected if:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Product appears used, washed, altered, or damaged after delivery</li>
            <li>Original tags, labels, or packaging are missing</li>
            <li>Request is raised after 48 hours from delivery</li>
            <li>Submitted proof is insufficient or unclear</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Rejected items may be returned to the customer at their expense.
          </p>
        </div>

        {/* 8. Stock Availability */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">8. Stock Availability</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">Replacements are subject to stock availability.</p>
          <p className="text-neutral-600 leading-relaxed mb-2">
            If the same product, size, or variant is unavailable, we may offer:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Alternative product</li>
            <li>Store credit</li>
            <li>Refund, where applicable</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            The mode of resolution will be determined reasonably based on product availability and applicable consumer rights.
          </p>
        </div>

        {/* 9. Delays & Force Majeure */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">9. Delays &amp; Force Majeure</h2>
          <p className="text-neutral-600 leading-relaxed mb-2">We are not liable for delays caused by:</p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Courier or logistics partners</li>
            <li>Natural disasters</li>
            <li>Government restrictions</li>
            <li>Strikes</li>
            <li>Technical failures</li>
            <li>Other events beyond our reasonable control</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            However, we will make reasonable efforts to keep customers informed regarding significant delays.
          </p>
        </div>

        {/* 10. Grievance Redressal */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">10. Grievance Redressal</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            For any cancellation, replacement, refund, or complaint-related queries, customers may contact:
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            <strong>Email:</strong>{" "}
            <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">
              hello@miksandchiks.com
            </a>
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Customer complaints will typically be acknowledged within <strong>48 business hours</strong> and resolved within a reasonable timeframe in accordance with applicable Indian consumer protection laws.
          </p>
        </div>

        {/* 11. Policy Updates */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">11. Policy Updates</h2>
          <p className="text-neutral-600 leading-relaxed">
            Miks &amp; Chiks reserves the right to modify or update this policy at any time without prior notice. Updated versions will be published on the website with the revised effective date.
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
