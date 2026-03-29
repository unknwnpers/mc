import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Information Collection</h2>
          <p className="text-neutral-600 leading-relaxed">
            At Miks & Chiks, we collect personal information such as your name, email address, phone number, and shipping address when you make a purchase or create an account. This information is used strictly to fulfill your orders, process payments via Razorpay, and provide a personalized experience.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Data Usage & Third Parties</h2>
          <p className="text-neutral-600 leading-relaxed">
            We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you (such as Razorpay for payments and Shiprocket for logistics), so long as those parties agree to keep this information confidential.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Payment Security</h2>
          <p className="text-neutral-600 leading-relaxed">
            Your payment sensitive information is processed securely by Razorpay, a PCI-DSS compliant payment gateway. We do not store your credit card, debit card, or any banking details on our servers.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Cookies</h2>
          <p className="text-neutral-600 leading-relaxed">
            We use cookies to help us remember and process the items in your shopping cart and understand your preferences for future visits.
          </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Contact Us</h2>
           <p className="text-neutral-600 leading-relaxed">
             If there are any questions regarding this privacy policy, you may contact us at support@miksandchiks.com.
           </p>
        </div>
      </section>
    </LegalLayout>
  );
}
