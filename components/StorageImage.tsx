'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StorageImageProps {
  imageId: string;
  alt: string;
  variant?: 'original' | 'thumbnail' | 'medium';
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageData {
  id: string;
  url: string;
  width: number;
  height: number;
  contentType: string;
}

/**
 * StorageImage Component
 * Fetches images from Firebase Storage via backend API
 * Falls back to placeholder on error
 */
export default function StorageImage({
  imageId,
  alt,
  variant = 'original',
  width,
  height,
  fill = false,
  priority = false,
  className,
  containerClassName,
  sizes,
  onLoad,
  onError,
}: StorageImageProps) {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchImage() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(`/api/images/${imageId}?variant=${variant}`);

        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }

        const data = await response.json();

        if (!data.success || !data.image) {
          throw new Error('Invalid image data');
        }

        if (!cancelled) {
          setImageData({
            id: data.image.id,
            url: data.image.url,
            width: data.image.width || width || 0,
            height: data.image.height || height || 0,
            contentType: data.image.contentType,
          });
        }
      } catch (err) {
        console.error('[StorageImage] Error fetching image:', err);
        if (!cancelled) {
          setError(true);
          onError?.();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (imageId) {
      fetchImage();
    }

    return () => {
      cancelled = true;
    };
  }, [imageId, variant]);

  const handleLoad = () => {
    setLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    onError?.();
  };

  // Show skeleton while loading
  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-gray-100',
          fill ? 'w-full h-full' : '',
          containerClassName
        )}
        style={
          !fill && width && height
            ? { width, height }
            : undefined
        }
      >
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  // Show placeholder on error or no image data
  if (error || !imageData) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-gray-100 flex items-center justify-center',
          fill ? 'w-full h-full' : '',
          containerClassName
        )}
        style={
          !fill && width && height
            ? { width, height }
            : undefined
        }
      >
        <Image
          src="/placeholder.svg"
          alt={alt}
          width={fill ? 100 : width || 100}
          height={fill ? 100 : height || 100}
          className={cn('opacity-50', className)}
          priority={priority}
        />
      </div>
    );
  }

  // Render the actual image
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'w-full h-full' : '',
        containerClassName
      )}
    >
      <Image
        src={imageData.url}
        alt={alt}
        width={fill ? undefined : width || imageData.width || 100}
        height={fill ? undefined : height || imageData.height || 100}
        fill={fill}
        priority={priority}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          loading ? 'opacity-0' : 'opacity-100',
          className
        )}
      />
    </div>
  );
}

/**
 * StaticImage Component
 * For images that are still in the public folder (fallback)
 */
interface StaticImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export function StaticImage({
  src,
  alt,
  width,
  height,
  fill,
  priority,
  className,
  sizes,
}: StaticImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
