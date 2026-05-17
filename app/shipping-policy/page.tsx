import LegalLayout from "@/components/LegalLayout";

export default function ShippingPolicy() {
  return (
    <LegalLayout title="Shipping Policy">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            At Miks & Chiks, we aim to deliver your orders safely and on time. This Shipping Policy outlines our delivery process, timelines, and related terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Order Processing</h2>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Orders are processed within <strong>1–2 business days</strong> after confirmation</li>
            <li>Orders placed on Sundays or public holidays will be processed on the next working day</li>
            <li>You will receive an order confirmation and tracking details once shipped</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Shipping Timeline</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Estimated delivery timelines:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li><strong>Kerala:</strong> 2–4 business days</li>
            <li><strong>South India:</strong> 3–6 business days</li>
            <li><strong>Rest of India:</strong> 5–8 business days</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Delivery timelines are estimates and may vary depending on location and courier availability.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Shipping Charges</h2>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Shipping charges (if applicable) will be displayed at checkout</li>
            <li>Free shipping offers, if any, will be clearly mentioned on the website</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Shipping fees are <strong>non-refundable</strong> once the order is shipped.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Cash on Delivery (COD)</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            If COD is available:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>COD orders may be subject to confirmation via phone or OTP</li>
            <li>We reserve the right to cancel COD orders that are unverified or suspected as fraudulent</li>
          </ul>

          <h3 className="text-lg font-bold text-charcoal mb-3 mt-6">Important:</h3>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Customers must accept the delivery when attempted</li>
            <li>Repeated order refusals may result in <strong>blocking of COD option</strong> for that customer</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Delivery Attempts</h2>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Our courier partners will attempt delivery up to <strong>2–3 times</strong></li>
            <li>If the customer is unavailable or refuses delivery, the order may be returned to us</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Returned orders due to non-acceptance may incur additional shipping charges for re-dispatch.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">6. Delays</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            While we strive for timely delivery, delays may occur due to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Weather conditions</li>
            <li>Courier partner issues</li>
            <li>High order volume</li>
            <li>Remote locations</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            We are not liable for delays caused by third-party logistics providers.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">7. Damaged or Missing Packages</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            If you receive a damaged package or missing items:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Report within <strong>48 hours of delivery</strong></li>
            <li>Provide photo/video proof</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed mt-4">
            We will investigate and resolve the issue accordingly.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">8. Incorrect Address</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Customers are responsible for providing accurate shipping details.
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Orders with incorrect or incomplete addresses may be delayed or cancelled</li>
            <li>We are not responsible for delivery failures due to incorrect information</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">9. Contact Us</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            For any shipping-related queries:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Email: <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">hello@miksandchiks.com</a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
