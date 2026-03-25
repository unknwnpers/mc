import LegalLayout from "@/components/LegalLayout";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Information Collection</h2>
        <p>At Miks & Chiks, we collect your name, email, and shipping address solely to fulfill your orders and provide a personalized luxury experience. We do not sell your data to third parties.</p>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Payment Security</h2>
        <p>Your payment information is processed securely by Razorpay. We do not store your credit card or banking details on our servers.</p>
      </section>
      {/* Add more sections as needed */}
    </LegalLayout>
  );
}
