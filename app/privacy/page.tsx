import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            At Miks & Chiks ("we", "our", "us"), we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Information We Collect</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We may collect the following information when you interact with our website:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Shipping and billing address</li>
            <li>Order and transaction details</li>
            <li>Device and browsing information (via cookies)</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            This information is collected when you:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mt-2">
            <li>Create an account</li>
            <li>Place an order</li>
            <li>Contact us</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. How We Use Your Information</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We use your information to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Process and deliver your orders</li>
            <li>Communicate order updates and support</li>
            <li>Process payments securely via Razorpay</li>
            <li>Improve website performance and user experience</li>
            <li>Prevent fraud and unauthorized transactions</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Sharing of Information</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We do not sell or rent your personal information.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We may share your data only with trusted third parties necessary to operate our business, including:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Razorpay (payment processing)</li>
            <li>Shiprocket (shipping and logistics)</li>
            <li>Hosting and analytics providers</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            These parties are obligated to keep your information secure and confidential.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Payment Security</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            All payment transactions are processed through Razorpay, a PCI-DSS compliant payment gateway.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            We do not store or have access to your credit card, debit card, or banking details.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Cookies and Tracking</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We use cookies to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Maintain your shopping cart</li>
            <li>Remember your preferences</li>
            <li>Analyze website traffic and usage</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            You can disable cookies through your browser settings, but some features of the website may not function properly.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">6. Data Retention</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We retain your information only as long as necessary to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li>Fulfill orders</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">7. Your Rights</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4 mb-4">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
          </ul>
          <p className="text-neutral-600 leading-relaxed">
            To exercise these rights, contact us at the email below.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">8. Data Security</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We implement appropriate security measures to protect your personal information from unauthorized access, misuse, or disclosure.
          </p>
          <p className="text-neutral-600 leading-relaxed">
            However, no method of transmission over the internet is 100% secure.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">9. Third-Party Links</h2>
          <p className="text-neutral-600 leading-relaxed">
            Our website may contain links to third-party websites. We are not responsible for the privacy practices of those sites.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">10. Changes to This Policy</h2>
          <p className="text-neutral-600 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">11. Contact Us</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            If you have any questions or concerns about this Privacy Policy, you may contact us at:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Email: <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">miksandchiks@gmail.com</a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
