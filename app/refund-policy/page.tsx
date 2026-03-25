import LegalLayout from "@/components/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Cancellations</h2>
        <p>Orders can only be cancelled before they are processed by our fulfillment team. Please contact us immediately if you wish to cancel.</p>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Refunds</h2>
        <p>We take pride in our quality. If you receive a damaged item, we offer a full refund or replacement. Please reach out within 48 hours of delivery.</p>
      </section>
    </LegalLayout>
  );
}
