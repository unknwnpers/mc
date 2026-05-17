import LegalLayout from "@/components/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            Welcome to Miks & Chiks. These Terms of Service ("Terms") govern your access to and use of our website and services. By using our website, you agree to be bound by these Terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Use of Our Website</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            You agree to use this website only for lawful purposes. You must not misuse the website, attempt unauthorized access, or disrupt its functionality.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            We reserve the right to suspend or terminate access if we believe you have violated these Terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Products and Availability</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All products listed on our website are subject to availability. We reserve the right to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Limit quantities per order</li>
            <li>Discontinue products at any time</li>
            <li>Refuse or cancel orders at our discretion</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            In case of errors in pricing, product details, or availability, we reserve the right to correct such errors and cancel or refuse orders, including after payment.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Pricing and Payments</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All prices are listed in INR (₹) and are subject to change without notice.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Payments are processed securely through Razorpay. By placing an order, you agree to provide valid payment information and authorize us to charge the total amount.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            We are not responsible for payment failures caused by third-party payment providers.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Order Confirmation and Cancellation</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Once an order is placed, you will receive a confirmation.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We reserve the right to cancel any order due to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Product unavailability</li>
            <li>Payment issues</li>
            <li>Suspected fraud or misuse</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            If your order is canceled after payment, a refund will be processed in accordance with our Refund Policy.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Shipping and Delivery</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We aim to deliver products within the estimated timelines; however, delays may occur due to external factors.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            We are not liable for delays caused by logistics partners or unforeseen circumstances.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">6. User Accounts</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            You are responsible for maintaining the confidentiality of your account credentials.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            You agree to provide accurate and complete information during registration and purchase.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            We are not liable for any unauthorized use of your account.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">7. Intellectual Property</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All content on this website, including text, images, graphics, logos, and design, is the property of Miks & Chiks and is protected by applicable copyright and intellectual property laws.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Unauthorized use is strictly prohibited.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">8. Limitation of Liability</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            To the fullest extent permitted by law, Miks & Chiks shall not be liable for:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Any indirect, incidental, or consequential damages</li>
            <li>Loss of data, revenue, or profits</li>
            <li>Issues arising from third-party services</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            Our total liability shall not exceed the amount paid by you for the product in question.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">9. Indemnification</h2>
          <p className="text-neutral-600 leading-relaxed">
            You agree to indemnify and hold harmless Miks & Chiks from any claims, damages, or losses arising from your misuse of the website or violation of these Terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">10. Changes to Terms</h2>
          <p className="text-neutral-600 leading-relaxed">
            We may update these Terms at any time. Continued use of the website constitutes acceptance of the updated Terms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">11. Governing Law</h2>
          <p className="text-neutral-600 leading-relaxed">
            These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Kochi, Kerala.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">12. Contact Information</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            For any questions regarding these Terms, please contact:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Email: <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">hello@miksandchiks.com</a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
