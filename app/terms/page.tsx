import LegalLayout from "@/components/LegalLayout";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <section className="space-y-8 text-neutral-600 leading-relaxed">
        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. Introduction</h2>
          <p>
            Welcome to Miks & Chiks. These Terms and Conditions govern your use of our website and services. By accessing or using our website, you agree to be bound by these terms. If you do not agree, please do not use our services.
          </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. Store Policies</h2>
           <p>
             All products listed on Miks & Chiks are subject to availability. We reserve the right to limit the quantity of products we supply, or to refuse service to any customer. While we strive for accuracy, errors in pricing or product descriptions may occur; we reserve the right to correct these and cancel affected orders.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. User Responsibilities</h2>
           <p>
             You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to provide accurate, current, and complete information during the purchase process.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Intellectual Property</h2>
           <p>
             All content on this site, including but not limited to text, graphics, logos, and images, is the property of Miks & Chiks and is protected by copyright laws. You may not reproduce, distribute, or create derivative works without our express written consent.
           </p>
        </div>

        <div>
           <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Governing Law</h2>
           <p>
             These terms shall be governed by and construed in accordance with the laws of India, and any disputes relating to these terms shall be subject to the exclusive jurisdiction of the courts in Kochi, Kerala.
           </p>
        </div>
      </section>
    </LegalLayout>
  );
}
