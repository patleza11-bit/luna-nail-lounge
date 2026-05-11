export const GALLERY_STORAGE_BUCKET = "gallery-images";
export const MAX_GALLERY_IMAGE_BYTES = 5 * 1024 * 1024;
export const GALLERY_UPLOAD_PREFIX = "uploads";
export const GALLERY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export type GalleryImageRecord = {
  id: string;
  image_url: string;
  storage_path: string;
  alt_text: string | null;
  created_at: string;
};

export function isAllowedGalleryImageType(type: string) {
  return GALLERY_IMAGE_MIME_TYPES.includes(
    type as (typeof GALLERY_IMAGE_MIME_TYPES)[number],
  );
}
