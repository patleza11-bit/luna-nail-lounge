"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  GALLERY_UPLOAD_PREFIX,
  MAX_GALLERY_IMAGE_BYTES,
  isAllowedGalleryImageType,
} from "@/app/admin/gallery/_lib/gallery-constants";
import {
  getGalleryPublicImageUrl,
  getGalleryServiceConfig,
  insertGalleryImageRecord,
  removeGalleryStorageObject,
  deleteGalleryImageRecord,
  selectGalleryImageStoragePath,
  uploadGalleryStorageObject,
} from "@/app/admin/gallery/_lib/gallery-supabase";
import { hasAdminSession } from "@/app/lib/admin-session";
import { formatSupabaseError } from "@/app/lib/supabase-errors";

export type GalleryActionState = {
  message: string;
  status: "error" | "idle" | "success";
  submittedAt: number;
};

const mimeExtensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function createActionState(
  status: GalleryActionState["status"],
  message: string,
): GalleryActionState {
  return {
    message,
    status,
    submittedAt: Date.now(),
  };
}

async function requireGalleryAdminConfig() {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }

  const config = getGalleryServiceConfig();

  if (!config) {
    return {
      data: null,
      error:
        "Add SUPABASE_SERVICE_ROLE_KEY before uploading or deleting gallery images.",
    };
  }

  return {
    data: config,
    error: "",
  };
}

function createStoragePath(file: File) {
  const fileBaseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "gallery-image";
  const extension = mimeExtensions.get(file.type) ?? "jpg";
  const timestamp = Math.floor(Date.now() / 1000);

  return `${GALLERY_UPLOAD_PREFIX}/${timestamp}-${fileBaseName}.${extension}`;
}

function revalidateGalleryPages() {
  revalidatePath("/");
  revalidatePath("/admin/gallery");
}

export async function uploadGalleryImage(
  previousState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  void previousState;

  const configResult = await requireGalleryAdminConfig();

  if (configResult.error || !configResult.data) {
    return createActionState("error", configResult.error);
  }

  const config = configResult.data;
  const image = formData.get("image");
  const altText = getFormString(formData, "altText").slice(0, 140);

  if (!(image instanceof File) || image.size === 0) {
    return createActionState("error", "Choose an image file before uploading.");
  }

  if (!isAllowedGalleryImageType(image.type)) {
    return createActionState(
      "error",
      "Only JPG, PNG, WebP, GIF, or AVIF images can be uploaded.",
    );
  }

  if (image.size > MAX_GALLERY_IMAGE_BYTES) {
    return createActionState("error", "Images must be 5 MB or smaller.");
  }

  const storagePath = createStoragePath(image);
  const fileBuffer = Buffer.from(await image.arrayBuffer());
  console.log("Gallery upload storage path:", storagePath);

  const { error: uploadError } = await uploadGalleryStorageObject(
    config,
    storagePath,
    fileBuffer,
    image.type,
  );

  if (uploadError) {
    console.error(
      "Gallery image storage upload error:",
      formatSupabaseError(uploadError),
    );
    return createActionState(
      "error",
      "The image could not be uploaded. Check the gallery-images storage bucket.",
    );
  }

  const imageUrl = getGalleryPublicImageUrl(config, storagePath);
  const dbPayload = {
    image_url: imageUrl,
    storage_path: storagePath,
    alt_text: altText || null,
  };

  console.log("Gallery upload public URL:", imageUrl);
  console.log("Gallery image DB row payload:", dbPayload);

  const { error: insertError } = await insertGalleryImageRecord(
    config,
    dbPayload,
  );

  if (insertError) {
    console.error(
      "Gallery image record insert error:",
      formatSupabaseError(insertError),
    );
    await removeGalleryStorageObject(config, storagePath);
    return createActionState(
      "error",
      "The image uploaded, but the gallery record could not be saved. Check the gallery_images table SQL.",
    );
  }

  revalidateGalleryPages();
  return createActionState("success", "Gallery image uploaded.");
}

export async function deleteGalleryImage(
  previousState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  void previousState;

  const configResult = await requireGalleryAdminConfig();

  if (configResult.error || !configResult.data) {
    return createActionState("error", configResult.error);
  }

  const config = configResult.data;
  const id = getFormString(formData, "id");
  const fallbackStoragePath = getFormString(formData, "storagePath");

  if (!id || !fallbackStoragePath) {
    return createActionState(
      "error",
      "Choose a valid gallery image to delete.",
    );
  }

  const { data: imageRow, error: lookupError } =
    await selectGalleryImageStoragePath(config, id);

  if (lookupError) {
    console.error(
      "Gallery image lookup before delete error:",
      formatSupabaseError(lookupError),
    );
    return createActionState("error", "That image could not be deleted.");
  }

  const storagePath =
    imageRow?.storage_path && typeof imageRow.storage_path === "string"
      ? imageRow.storage_path
      : fallbackStoragePath;

  if (!storagePath) {
    return createActionState(
      "error",
      "That gallery image was already removed.",
    );
  }

  const { error: storageError } = await removeGalleryStorageObject(
    config,
    storagePath,
  );

  if (storageError) {
    console.error(
      "Gallery image storage delete error:",
      formatSupabaseError(storageError),
    );
    return createActionState(
      "error",
      "The storage object could not be deleted. Check the gallery-images bucket permissions and try again.",
    );
  }

  const { error: deleteError } = await deleteGalleryImageRecord(config, id);

  if (deleteError) {
    console.error(
      "Gallery image record delete error:",
      formatSupabaseError(deleteError),
    );
    return createActionState("error", "That image could not be deleted.");
  }

  revalidateGalleryPages();
  return createActionState("success", "Gallery image deleted.");
}
