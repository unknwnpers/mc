"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Star, Trash2, RefreshCw, X, User,
  Calendar, Search, Filter, ArrowLeft, Loader2, Image as ImageIcon,
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  rating: number;
  comment: string;
  status: string;
  verifiedPurchase: boolean;
  images?: string[];
  createdAt: any;
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
  });
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  const [reviews, setReviews] = useState<Review[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    if (!user || !isAdmin) return;
    setFetching(true);
    try {
      const res = await adminFetch("/api/admin/reviews");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviews(data.reviews || []);
    } catch (e: any) {
      toast.error(e.message || "Could not load reviews");
    } finally {
      setFetching(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!loading && isAdmin) fetchReviews();
  }, [loading, isAdmin, fetchReviews]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

    setDeletingId(reviewId);
    try {
      const res = await adminFetch("/api/admin/reviews", {
        method: "DELETE",
        body: JSON.stringify({ reviewId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Review deleted successfully");
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch =
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.userName || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = ratingFilter === "all" || r.rating.toString() === ratingFilter;

    return matchesSearch && matchesRating;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/10 border-t-white" />
    </div>
  );

  if (!user || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <button onClick={() => router.push("/")} className="text-sm text-white/50 hover:text-white transition-colors">← Return to Store</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin")}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-blush" />
                Review Management
              </h1>
              <p className="text-white/40 text-sm">{reviews.length} total reviews</p>
            </div>
          </div>
          <button
            onClick={fetchReviews}
            disabled={fetching}
            className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4 text-white/60", fetching && "animate-spin")} />
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by comment, product ID, or user..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 appearance-none min-w-[140px]"
              >
                <option value="all" className="bg-[#111]">All Ratings</option>
                {[5, 4, 3, 2, 1].map(r => (
                  <option key={r} value={r} className="bg-[#111]">{r} Stars</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {fetching ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-20 bg-white/3 rounded-2xl border border-white/10 border-dashed">
            <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No reviews found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReviews.map(review => (
              <div key={review.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={cn(
                              "w-4 h-4",
                              i <= review.rating ? "text-amber-400 fill-current" : "text-white/10"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white/40 px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
                        {review.rating} / 5
                      </span>
                      {review.verifiedPurchase && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                        </span>
                      )}
                    </div>

                    <p className="text-white/80 text-sm leading-relaxed mb-4 italic font-medium">
                      "{review.comment || "No comment provided."}"
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                      <div className="flex items-center gap-2 text-white/40">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">User: {review.userName || review.userId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Product ID: {review.productId}</span>
                      </div>
                    </div>

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-4">
                        {review.images.map((img, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden border border-white/10">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-center justify-end gap-2">
                    <button
                      onClick={() => router.push(`/admin/products?search=${review.productId}`)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10"
                      title="View Product"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(review.id)}
                      disabled={deletingId === review.id}
                      className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 transition-all border border-red-500/20"
                      title="Delete Review"
                    >
                      {deletingId === review.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
