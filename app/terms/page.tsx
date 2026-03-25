import LegalLayout from "@/components/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Store Terms</h2>
        <p>By using Miks & Chiks, you agree to our premium service standards. All orders are subject to availability and stock verification.</p>
      </section>
      <section>
        <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Pricing</h2>
        <p>Prices are subject to change without notice. We reserve the right to cancel orders with incorrect pricing due to technical errors.</p>
      </section>
    </LegalLayout>
  );
}
