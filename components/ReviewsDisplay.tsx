"use client";

import { Star, User, Calendar, Image as ImageIcon, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  images?: string[];
  verifiedPurchase: boolean;
  createdAt: Date | null;
}

interface ReviewsDisplayProps {
  reviews: Review[];
  averageRating: number;
  productId: string;
  canModerate?: boolean;
  onReviewDeleted?: () => void;
}

export function ReviewsDisplay({ 
  reviews, 
  averageRating, 
  productId,
  canModerate = false,
  onReviewDeleted 
}: ReviewsDisplayProps) {
  const { user, profile } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  async function deleteReview(reviewId: string) {
    if (!confirm("Are you sure you want to delete this review?")) return;

    setDeletingId(reviewId);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch('/api/admin/reviews', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reviewId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Review deleted");
        onReviewDeleted?.();
      } else {
        toast.error(data.error || "Failed to delete review");
      }
    } catch (error: any) {
      console.error("Delete review error:", error);
      toast.error("Failed to delete review");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  function getRatingLabel(rating: number): string {
    const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[rating - 1] || '';
  }

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 
      : 0,
  }));

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-black text-gray-900 mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
              {averageRating > 0 && (
                <p className="text-sm font-medium text-blue-700 mt-2">
                  {getRatingLabel(Math.round(averageRating))}
                </p>
              )}
            </div>

            {/* Distribution Bars */}
            <div className="space-y-2">
              {ratingDistribution.map(({ stars, count, percentage }) => (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium text-gray-700">{stars}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
          
          {reviews.map((review) => (
            <Card key={review.id} className="border-gray-200 hover:border-gray-300 transition-colors">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Verified Buyer</span>
                        {review.verifiedPurchase && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {getRatingLabel(review.rating)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                    
                    {isAdmin && canModerate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReview(review.id)}
                        disabled={deletingId === review.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingId === review.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                    {review.comment}
                  </p>
                )}

                {/* Images */}
                {review.images && review.images.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <ImageIcon className="w-4 h-4" />
                      <span>Customer Images ({review.images.length})</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {review.images.map((image, index) => (
                        <a
                          key={index}
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors cursor-zoom-in group"
                        >
                          <img
                            src={image}
                            alt={`Review image ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No reviews yet
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Be the first to review this product! Your feedback helps others make informed decisions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
