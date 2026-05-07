import { ShieldCheck, RefreshCw, Star, Heart, Smile, Headphones } from 'lucide-react';

export default function TrustStrip() {
  const trustItems = [
    { icon: ShieldCheck, title: "100% Secure Payments", color: "text-green-600", bg: "bg-green-50" },
    { icon: RefreshCw, title: "Easy 7-Day Returns", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Star, title: "Premium Quality", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Heart, title: "Thoughtful Designs", color: "text-rose-600", bg: "bg-rose-50" },
    { icon: Smile, title: "Made for Moms", color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Headphones, title: "Hassle-Free Support", color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <section className="py-12 bg-white border-y border-[#F3E8E5]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {trustItems.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center group cursor-default">
              <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                <item.icon className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/80 leading-tight">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
