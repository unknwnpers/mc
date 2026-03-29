import LegalLayout from "@/components/LegalLayout";

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <section className="space-y-8 text-neutral-600 leading-relaxed">
        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Cancellations</h2>
           <p>
             Orders can be cancelled within 12 hours of placement or until they are processed for shipment, whichever is earlier. To cancel your order, please email support@miksandchiks.com with your Order ID. Once an order is shipped, it cannot be cancelled.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Returns & Exchanges</h2>
           <p>
             We offer a 7-day return/exchange policy for most items. If you receive a product that is damaged, defective, or incorrect, please notify us within 48 hours of delivery. To be eligible for a return, your item must be unused, in the same condition as received, and in its original packaging.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Refunds Process</h2>
           <p>
             Once your return is received and inspected, we will notify you of the approval or rejection of your refund. If approved, your refund will be processed and a credit will automatically be applied to your original method of payment (via Razorpay) within 5-7 business days.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Non-Returnable Items</h2>
           <p>
             For hygiene reasons, certain categories like newborn essentials and custom-made apparel are not eligible for returns unless they arrive damaged.
           </p>
        </div>
      </section>
    </LegalLayout>
  );
}
