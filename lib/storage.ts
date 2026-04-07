import { storage, db } from "./firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import { collection, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";

// Image size variants
export type ImageVariant = "original" | "thumbnail" | "medium";

export interface UploadOptions {
  entityType: "products" | "categories" | "users" | "system";
  entityId?: string; // productId, categoryId, userId
  variant?: ImageVariant;
  fileName?: string;
}

/**
 * Generate organized storage path
 * Structure: {entityType}/{entityId}/{variant}/{timestamp}_{filename}
 * Examples:
 *   - products/prod_123/original/1234567890-image.jpg
 *   - products/prod_123/thumbnail/1234567890-image.jpg_200x200
 *   - categories/cat_456/original/1234567890-banner.jpg
 *   - users/user_789/avatar/1234567890-profile.jpg
 */
function generateStoragePath(file: File, options: UploadOptions): string {
  const timestamp = Date.now();
  const sanitizedName = (options.fileName || file.name)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-");
  
  const variant = options.variant || "original";
  const entityId = options.entityId || "temp";
  
  return `${options.entityType}/${entityId}/${variant}/${timestamp}-${sanitizedName}`;
}

/**
 * Upload an image file to Firebase Storage with organized structure
 * @param file - The file to upload
 * @param options - Upload options including entity type, ID, and variant
 * @returns The download URL of the uploaded image
 */
export async function uploadImage(
  file: File,
  options: UploadOptions
): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Image size must be less than 5MB");
  }

  // Generate organized path
  const path = generateStoragePath(file, options);
  const storageRef = ref(storage, path);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file);

  // Get download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Legacy upload function for backward compatibility
 * @deprecated Use uploadImage with UploadOptions instead
 */
export async function uploadImageLegacy(
  file: File,
  path: string = "images",
  fileName?: string
): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("Image size must be less than 5MB");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = (fileName || file.name)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-");
  const uniqueFileName = `${timestamp}-${sanitizedName}`;

  // Create storage reference
  const storageRef = ref(storage, `${path}/${uniqueFileName}`);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file);

  // Get download URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * Upload multiple images to Firebase Storage with organized structure
 * @param files - Array of files to upload
 * @param options - Upload options
 * @returns Array of download URLs
 */
export async function uploadMultipleImages(
  files: File[],
  options: UploadOptions
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, options));
  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Firebase Storage
 * @param imageUrl - The full download URL of the image
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }

  try {
    // Extract the path from the download URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.*?)$/);
    
    if (!pathMatch) {
      throw new Error("Invalid image URL");
    }

    const encodedPath = pathMatch[1];
    const path = decodeURIComponent(encodedPath);

    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

/**
 * Get all images in a directory
 * @param path - The storage path
 * @returns Array of download URLs
 */
export async function listImages(path: string = "images"): Promise<string[]> {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }

  const listRef = ref(storage, path);
  const result = await listAll(listRef);

  const urlPromises = result.items.map((itemRef) => getDownloadURL(itemRef));
  return Promise.all(urlPromises);
}

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Validation result
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Only image files are allowed (JPEG, PNG, WebP)" };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: "Image size must be less than 5MB" };
  }

  // Check allowed formats
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, and WebP formats are supported",
    };
  }

  return { valid: true };
}

/**
 * Generate a placeholder image URL for errors
 */
export function getPlaceholderImage(): string {
  return "/placeholder.svg";
}

// ============================================
// IMAGE RESIZING UTILITIES
// ============================================

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  type?: "image/jpeg" | "image/webp" | "image/png";
}

/**
 * Resize an image file using Canvas API
 * @param file - Original image file
 * @param options - Resize options
 * @returns Resized image as Blob
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.85,
    type = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Use better quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw and resize
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas to Blob conversion failed"));
          }
        },
        type,
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a thumbnail from an image file
 * @param file - Original image file
 * @returns Thumbnail blob (200x200, JPEG, 80% quality)
 */
export async function createThumbnail(file: File): Promise<Blob> {
  return resizeImage(file, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.8,
    type: "image/jpeg",
  });
}

/**
 * Create a medium-sized image from original
 * @param file - Original image file
 * @returns Medium image blob (800x800, JPEG, 85% quality)
 */
export async function createMediumImage(file: File): Promise<Blob> {
  return resizeImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    type: "image/jpeg",
  });
}

/**
 * Upload image with automatic variant generation
 * Uploads original + thumbnail + medium sizes
 * @param file - Original image file
 * @param options - Upload options
 * @returns Object with URLs for all variants
 */
export async function uploadImageWithVariants(
  file: File,
  options: Omit<UploadOptions, "variant">
): Promise<{
  original: string;
  thumbnail: string;
  medium: string;
}> {
  if (!storage) {
    throw new Error("Firebase Storage not initialized");
  }

  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create variants
  const [thumbnailBlob, mediumBlob] = await Promise.all([
    createThumbnail(file),
    createMediumImage(file),
  ]);

  // Create variant files with proper names
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const thumbnailFile = new File([thumbnailBlob], `${baseName}_thumb.jpg`, {
    type: "image/jpeg",
  });
  const mediumFile = new File([mediumBlob], `${baseName}_medium.jpg`, {
    type: "image/jpeg",
  });

  // Upload all variants in parallel
  const [originalUrl, thumbnailUrl, mediumUrl] = await Promise.all([
    uploadImage(file, { ...options, variant: "original" }),
    uploadImage(thumbnailFile, { ...options, variant: "thumbnail" }),
    uploadImage(mediumFile, { ...options, variant: "medium" }),
  ]);

  return {
    original: originalUrl,
    thumbnail: thumbnailUrl,
    medium: mediumUrl,
  };
}

// ============================================
// IMAGE METADATA TRACKING
// ============================================

export interface ImageMetadata {
  id: string;
  entityType: "products" | "categories" | "users" | "system";
  entityId: string;
  originalUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: Timestamp;
  uploadedBy?: string;
  storagePath: string;
}

/**
 * Save image metadata to Firestore
 * @param metadata - Image metadata object
 */
export async function saveImageMetadata(
  metadata: Omit<ImageMetadata, "id" | "uploadedAt">
): Promise<string> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const metadataDoc: ImageMetadata = {
    ...metadata,
    id,
    uploadedAt: Timestamp.now(),
  };

  await setDoc(doc(db, "image_metadata", id), metadataDoc);
  return id;
}

/**
 * Delete image metadata from Firestore
 * @param metadataId - The metadata document ID
 */
export async function deleteImageMetadata(metadataId: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  await deleteDoc(doc(db, "image_metadata", metadataId));
}

/**
 * Track image upload with metadata
 * Use this instead of raw uploadImage for production
 */
export async function uploadImageWithTracking(
  file: File,
  options: UploadOptions & { uploadedBy?: string }
): Promise<{ url: string; metadataId: string }> {
  // Upload to Storage
  const url = await uploadImage(file, options);

  // Extract storage path from URL
  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/o\/(.*?)$/);
  const storagePath = pathMatch ? decodeURIComponent(pathMatch[1]) : "";

  // Save metadata
  const metadataId = await saveImageMetadata({
    entityType: options.entityType,
    entityId: options.entityId || "temp",
    originalUrl: url,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    uploadedBy: options.uploadedBy,
    storagePath,
  });

  return { url, metadataId };
}

// ============================================
// ORPHANED IMAGE CLEANUP
// ============================================

import { query, where, getDocs, deleteDoc as deleteFirestoreDoc } from "firebase/firestore";

/**
 * Find orphaned images - images in metadata that are no longer referenced by entities
 * @param entityType - Type of entity to check
 * @param entityIds - Array of valid entity IDs currently in use
 * @returns Array of orphaned metadata documents
 */
export async function findOrphanedImages(
  entityType: "products" | "categories" | "users",
  validEntityIds: string[]
): Promise<ImageMetadata[]> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const orphaned: ImageMetadata[] = [];
  const validIdSet = new Set(validEntityIds);

  // Query all metadata for this entity type
  const q = query(
    collection(db, "image_metadata"),
    where("entityType", "==", entityType)
  );
  const snapshot = await getDocs(q);

  snapshot.forEach((doc) => {
    const metadata = doc.data() as ImageMetadata;
    if (!validIdSet.has(metadata.entityId)) {
      orphaned.push(metadata);
    }
  });

  return orphaned;
}

/**
 * Delete an image and its metadata
 * @param metadata - Image metadata object
 */
export async function deleteImageWithMetadata(
  metadata: ImageMetadata
): Promise<void> {
  // Delete from Storage
  try {
    await deleteImage(metadata.originalUrl);
  } catch (err) {
    console.warn("Failed to delete image from storage:", err);
  }

  // Delete thumbnail if exists
  if (metadata.thumbnailUrl) {
    try {
      await deleteImage(metadata.thumbnailUrl);
    } catch (err) {
      console.warn("Failed to delete thumbnail:", err);
    }
  }

  // Delete medium if exists
  if (metadata.mediumUrl) {
    try {
      await deleteImage(metadata.mediumUrl);
    } catch (err) {
      console.warn("Failed to delete medium image:", err);
    }
  }

  // Delete metadata from Firestore
  await deleteImageMetadata(metadata.id);
}

/**
 * Clean up orphaned images for a specific entity type
 * @param entityType - Type of entity
 * @param validEntityIds - Array of valid entity IDs
 * @returns Cleanup result stats
 */
export async function cleanupOrphanedImages(
  entityType: "products" | "categories" | "users",
  validEntityIds: string[]
): Promise<{
  deleted: number;
  failed: number;
  freedBytes: number;
}> {
  const orphaned = await findOrphanedImages(entityType, validEntityIds);
  let deleted = 0;
  let failed = 0;
  let freedBytes = 0;

  for (const metadata of orphaned) {
    try {
      freedBytes += metadata.fileSize;
      if (metadata.thumbnailUrl) freedBytes += Math.floor(metadata.fileSize * 0.1);
      if (metadata.mediumUrl) freedBytes += Math.floor(metadata.fileSize * 0.5);
      
      await deleteImageWithMetadata(metadata);
      deleted++;
    } catch (err) {
      console.error(`Failed to delete orphaned image ${metadata.id}:`, err);
      failed++;
    }
  }

  return { deleted, failed, freedBytes };
}

/**
 * Clean up temp images older than 24 hours
 * Images uploaded to temp/ folder that were never associated with an entity
 */
export async function cleanupTempImages(): Promise<{
  deleted: number;
  failed: number;
}> {
  if (!db) {
    throw new Error("Firestore not initialized");
  }

  const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  
  const q = query(
    collection(db, "image_metadata"),
    where("entityId", "==", "temp"),
    where("uploadedAt", "<", oneDayAgo)
  );
  
  const snapshot = await getDocs(q);
  let deleted = 0;
  let failed = 0;

  for (const docSnapshot of snapshot.docs) {
    const metadata = docSnapshot.data() as ImageMetadata;
    try {
      await deleteImageWithMetadata(metadata);
      deleted++;
    } catch (err) {
      console.error(`Failed to delete temp image ${metadata.id}:`, err);
      failed++;
    }
  }

  return { deleted, failed };
}
