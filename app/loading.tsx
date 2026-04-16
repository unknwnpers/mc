import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-rose-50/20 to-amber-50/20">
      {/* Navbar Skeleton */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#F3E8E5] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex justify-between items-center h-[88px]">
          <Skeleton className="w-48 h-12 rounded-xl" />
          <div className="flex gap-4">
            <Skeleton className="w-20 h-8 rounded-lg" />
            <Skeleton className="w-20 h-8 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </div>
      </nav>

      {/* Hero Skeleton */}
      <section className="pt-32 pb-20 min-h-[90vh] flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <Skeleton className="w-48 h-6 rounded-full" />
              <Skeleton className="w-full h-24 rounded-2xl" />
              <Skeleton className="w-3/4 h-16 rounded-2xl" />
              <Skeleton className="w-2/3 h-12 rounded-2xl" />
              <div className="flex gap-4">
                <Skeleton className="w-40 h-14 rounded-2xl" />
                <Skeleton className="w-32 h-14 rounded-2xl" />
              </div>
            </div>
            <Skeleton className="aspect-[4/5] w-full max-w-md mx-auto rounded-[40px]" />
          </div>
        </div>
      </section>

      {/* Collections Skeleton */}
      <section className="py-24 bg-white rounded-[60px] my-12 mx-4">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <Skeleton className="w-64 h-12 mb-16 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[400px] rounded-[40px]" />
            ))}
          </div>
        </div>
      </section>

      {/* Products Skeleton */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <Skeleton className="w-48 h-12 mb-16 rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-6">
                <Skeleton className="aspect-[4/5] w-full rounded-[32px]" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
