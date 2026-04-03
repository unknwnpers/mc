"use client";

import { useState, useEffect } from "react";
import { Star, Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const maxImages = 5;

  function handleRatingClick(rating: number) {
    setRating(rating);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    
    if (files.length + imageFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate and add files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name} exceeds 5MB size limit`);
        return false;
      }
      return true;
    });

    setImageFiles(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = ''; // Reset input
  }

  function removeImage(index: number) {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }

    if (comment.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      
      // TODO: Upload images to Firebase Storage and get URLs
      // For now, we'll submit without images or with placeholder
      const imageUrls: string[] = []; // Will be populated after image upload
      
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          rating,
          comment: comment.trim(),
          images: imageUrls,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Review submitted successfully!");
        setRating(0);
        setComment("");
        setImageFiles([]);
        setImagePreviews([]);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to submit review");
      }
    } catch (error: any) {
      console.error("Review submission error:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Rating *
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
              Your Review *
            </label>
            <Textarea
              id="review"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters. Be honest and detailed!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photos (Optional)
            </label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={imageFiles.length >= maxImages}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imageFiles.length === 0 
                  ? 'Upload Images' 
                  : `${imageFiles.length} / ${maxImages} images`}
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ImageIcon className="w-4 h-4" />
                <span>Max {maxImages} images, 5MB each</span>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              By submitting this review, you confirm that you have purchased and used this product. 
              Reviews are verified before being published.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRating(0);
                setComment("");
                setImageFiles([]);
                setImagePreviews([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || rating === 0 || comment.trim().length < 10}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
