import LegalLayout from "@/components/LegalLayout";

export default function CookiesPolicy() {
  return (
    <LegalLayout title="Cookies Policy">
      <div className="text-sm text-neutral-500 mb-8">
        Effective Date: March 31, 2026
      </div>

      <section className="space-y-8">
        <div>
          <p className="text-neutral-600 leading-relaxed mb-6">
            At Miks & Chiks, we use cookies and similar tracking technologies to improve your browsing experience, analyze site traffic, and understand where our audience comes from. By using our website, you consent to our use of cookies in accordance with this Cookies Policy.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">1. What Are Cookies?</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            Cookies are small text files that are placed on your device (computer, smartphone, or other electronic device) when you visit our website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">2. How We Use Cookies</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            We use cookies for various purposes, including:
          </p>
          <ul className="list-disc list-inside text-neutral-600 leading-relaxed space-y-2 ml-4">
            <li><strong>Essential Cookies:</strong> These are strictly necessary for the operation of our website, such as allowing you to log into secure areas or use a shopping cart.</li>
            <li><strong>Analytical/Performance Cookies:</strong> They allow us to recognize and count the number of visitors and see how visitors move around our website when using it. This helps us improve the way our website works.</li>
            <li><strong>Functionality Cookies:</strong> These are used to recognize you when you return to our website, enabling us to personalize content and remember your preferences.</li>
            <li><strong>Targeting Cookies:</strong> These cookies record your visit to our website, the pages you have visited, and the links you have followed. We may use this information to make our website and the advertising displayed on it more relevant to your interests.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">3. Managing Cookies</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site and some services and functionalities may not work.
          </p>
          <p className="text-neutral-600 leading-relaxed mb-4">
            For more information on how to manage cookies, please visit your browser's settings or help page.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">4. Third-Party Cookies</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the website and deliver advertisements on and through the website.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-charcoal mb-4">5. Contact Us</h2>
          <p className="text-neutral-600 leading-relaxed mb-4">
            If you have any questions or concerns about our use of cookies, you may contact us at:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Email: <a href="mailto:miksandchiks@gmail.com" className="text-blush hover:underline">hello@miksandchiks.com</a>
          </p>
        </div>
      </section>
    </LegalLayout>
  );
}
