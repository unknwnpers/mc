import Navbar from "./Navbar";
import Footer from "./Footer";

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h1 className="text-5xl font-serif font-bold text-charcoal mb-12 text-center">
            {title}
          </h1>
          <div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed space-y-8 font-sans">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
