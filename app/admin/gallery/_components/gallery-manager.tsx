"use client";

import { createClient } from "@supabase/supabase-js";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminPanel } from "@/app/admin/_components/admin-page-shell";
import {
  GALLERY_IMAGE_MIME_TYPES,
  MAX_GALLERY_IMAGE_BYTES,
  type GalleryImageRecord,
} from "@/app/admin/gallery/_lib/gallery-constants";
import { GalleryImagePreview } from "@/app/components/gallery-image-preview";
import {
  deleteGalleryImage,
  uploadGalleryImage,
  type GalleryActionState,
} from "@/app/admin/gallery/actions";
import {
  describeSupabaseError,
  formatSupabaseError,
} from "@/app/lib/supabase-errors";

type GalleryManagerProps = {
  hasServiceKey: boolean;
  initialMessage?: string;
};

const initialActionState: GalleryActionState = {
  message: "",
  status: "idle",
  submittedAt: 0,
};

const legacyMessages = {
  "delete-error": {
    text: "That image could not be deleted.",
    tone: "error",
  },
  "delete-invalid": {
    text: "Choose a valid gallery image to delete.",
    tone: "error",
  },
  "delete-missing": {
    text: "That gallery image was already removed.",
    tone: "error",
  },
  "delete-storage-error": {
    text: "The storage object could not be deleted. Check the gallery-images bucket permissions and try again.",
    tone: "error",
  },
  deleted: {
    text: "Gallery image deleted.",
    tone: "success",
  },
  "service-missing": {
    text: "Add SUPABASE_SERVICE_ROLE_KEY before uploading or deleting gallery images.",
    tone: "error",
  },
  "upload-invalid": {
    text: "Choose an image file before uploading.",
    tone: "error",
  },
  "upload-record-error": {
    text: "The image uploaded, but the gallery record could not be saved. Check the gallery_images table SQL.",
    tone: "error",
  },
  "upload-size": {
    text: "Images must be 5 MB or smaller.",
    tone: "error",
  },
  "upload-storage-error": {
    text: "The image could not be uploaded. Check the gallery-images storage bucket.",
    tone: "error",
  },
  "upload-type": {
    text: "Only JPG, PNG, WebP, GIF, or AVIF images can be uploaded.",
    tone: "error",
  },
  uploaded: {
    text: "Gallery image uploaded.",
    tone: "success",
  },
} as const;

const fieldClass =
  "mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]";
const fileFieldClass =
  "mt-2 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] text-sm text-[#5f544f] outline-none transition file:mr-4 file:min-h-12 file:border-0 file:bg-[#2f2824] file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-[#9f635d] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]";
const labelClass = "text-sm font-medium text-[#5f544f]";
const primaryButtonClass =
  "min-h-12 rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#cdbfba] disabled:text-[#786c66] disabled:shadow-none";
const dangerButtonClass =
  "min-h-11 rounded-lg border border-[#e8beb6] px-4 text-sm font-semibold text-[#9f3f36] transition hover:bg-[#fff2ef] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:border-[#ded0c8] disabled:text-[#9d8d85]";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return dateFormatter.format(parsedDate);
}

function normalizeGalleryImages(data: unknown[] | null) {
  return ((data ?? []) as Partial<GalleryImageRecord>[])
    .filter((image) => image.id && image.image_url && image.storage_path)
    .map(
      (image) =>
        ({
          id: String(image.id),
          image_url: String(image.image_url),
          storage_path: String(image.storage_path),
          alt_text:
            typeof image.alt_text === "string" && image.alt_text.trim()
              ? image.alt_text
              : null,
          created_at:
            typeof image.created_at === "string" ? image.created_at : "",
        }) satisfies GalleryImageRecord,
    );
}

function LegacyMessageBanner({ message }: { message?: string }) {
  if (!message || !(message in legacyMessages)) {
    return null;
  }

  const banner = legacyMessages[message as keyof typeof legacyMessages];
  const isError = banner.tone === "error";

  return (
    <div
      className={`mb-5 rounded-lg border p-4 text-sm ${
        isError
          ? "border-[#e8beb6] bg-[#fff2ef] text-[#9f3f36]"
          : "border-[#d8bcb2] bg-[#fff7f8] text-[#6f4f45]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {banner.text}
    </div>
  );
}

function ActionBanner({ state }: { state: GalleryActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isError = state.status === "error";

  return (
    <div
      className={`mb-5 rounded-lg border p-4 text-sm ${
        isError
          ? "border-[#e8beb6] bg-[#fff2ef] text-[#9f3f36]"
          : "border-[#d8bcb2] bg-[#fff7f8] text-[#6f4f45]"
      }`}
      role={isError ? "alert" : "status"}
    >
      {state.message}
    </div>
  );
}

function GalleryGrid({
  deleteAction,
  hasServiceKey,
  images,
  isDeleting,
  isLoading,
}: {
  deleteAction: (formData: FormData) => void;
  hasServiceKey: boolean;
  images: GalleryImageRecord[];
  isDeleting: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-8 text-center text-sm text-[#6f625b]">
        Loading gallery images...
      </p>
    );
  }

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-8 text-center text-sm text-[#6f625b]">
        No gallery images have been uploaded yet.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <article
          className="overflow-hidden rounded-lg border border-[#eadbd1] bg-white shadow-sm shadow-[#eadbd1]/35"
          key={image.id}
        >
          <div className="relative aspect-[4/5] bg-[#f8efe9]">
            <GalleryImagePreview
              alt={
                image.alt_text ||
                "Nail salon gallery image from Luna Nail Lounge"
              }
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              src={image.image_url}
            />
          </div>
          <div className="p-4">
            <p className="min-h-6 text-sm leading-6 text-[#5f544f]">
              {image.alt_text || "No alt text added."}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eadbd1] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9f635d]">
                {formatDate(image.created_at)}
              </p>
              <form action={deleteAction}>
                <input name="id" type="hidden" value={image.id} />
                <input
                  name="storagePath"
                  type="hidden"
                  value={image.storage_path}
                />
                <button
                  className={dangerButtonClass}
                  disabled={!hasServiceKey || isDeleting}
                  type="submit"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function GalleryManager({
  hasServiceKey,
  initialMessage,
}: GalleryManagerProps) {
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [images, setImages] = useState<GalleryImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploadState, uploadAction, isUploading] = useActionState(
    uploadGalleryImage,
    initialActionState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteGalleryImage,
    initialActionState,
  );
  const supabaseClient = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    return createClient(supabaseUrl, supabaseKey);
  }, []);

  const loadGalleryImages = useCallback(async () => {
    if (!supabaseClient) {
      setImages([]);
      setLoadError("Supabase public URL or anon key is not configured.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabaseClient
        .from("gallery_images")
        .select("id,image_url,storage_path,alt_text,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Admin gallery_images browser load error:",
          JSON.stringify(formatSupabaseError(error), null, 2),
        );
        setImages([]);
        setLoadError(
          `Gallery images could not be loaded. ${describeSupabaseError(error)}`,
        );
        return;
      }

      setImages(normalizeGalleryImages(data));
      setLoadError("");
    } catch (error) {
      console.error(
        "Unexpected admin gallery browser load error:",
        JSON.stringify(formatSupabaseError(error), null, 2),
      );
      setImages([]);
      setLoadError("Gallery images could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient]);

  useEffect(() => {
    const galleryTimer = window.setTimeout(() => {
      void loadGalleryImages();
    }, 0);

    return () => {
      window.clearTimeout(galleryTimer);
    };
  }, [loadGalleryImages]);

  useEffect(() => {
    if (uploadState.status === "success") {
      uploadFormRef.current?.reset();
      const galleryTimer = window.setTimeout(() => {
        void loadGalleryImages();
      }, 0);

      return () => {
        window.clearTimeout(galleryTimer);
      };
    }
  }, [loadGalleryImages, uploadState.status, uploadState.submittedAt]);

  useEffect(() => {
    if (deleteState.status === "success") {
      const galleryTimer = window.setTimeout(() => {
        void loadGalleryImages();
      }, 0);

      return () => {
        window.clearTimeout(galleryTimer);
      };
    }
  }, [deleteState.status, deleteState.submittedAt, loadGalleryImages]);

  const maxMegabytes = Math.floor(MAX_GALLERY_IMAGE_BYTES / 1024 / 1024);

  return (
    <>
      <LegacyMessageBanner message={initialMessage} />
      <ActionBanner state={uploadState} />
      <ActionBanner state={deleteState} />

      {!hasServiceKey ? (
        <div className="mb-5 rounded-lg border border-[#e4c1cf] bg-[#fff7f8] p-4 text-sm leading-6 text-[#6f4f45]">
          <p className="font-semibold text-[#2f2824]">
            Gallery uploads need server-side admin access.
          </p>
          <p className="mt-1">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>{" "}
            so the passcode-protected admin page can upload and delete images
            without exposing private keys to the browser.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="mb-5 rounded-lg border border-[#e8beb6] bg-[#fff2ef] p-4 text-sm text-[#9f3f36]">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <AdminPanel
          title="Upload image"
          description={`JPG, PNG, WebP, GIF, or AVIF. Maximum ${maxMegabytes} MB.`}
        >
          <form
            action={uploadAction}
            className="grid gap-4"
            ref={uploadFormRef}
          >
            <label className="block">
              <span className={labelClass}>Image</span>
              <input
                accept={GALLERY_IMAGE_MIME_TYPES.join(",")}
                className={fileFieldClass}
                disabled={!hasServiceKey || isUploading}
                name="image"
                required
                type="file"
              />
            </label>

            <label className="block">
              <span className={labelClass}>Alt text optional</span>
              <input
                className={fieldClass}
                disabled={!hasServiceKey || isUploading}
                maxLength={140}
                name="altText"
                placeholder="Soft pink almond manicure with chrome detail"
                type="text"
              />
            </label>

            <button
              className={`${primaryButtonClass} w-full`}
              disabled={!hasServiceKey || isUploading}
              type="submit"
            >
              {isUploading ? "Uploading..." : "Upload image"}
            </button>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Current gallery"
          description="Images shown on the customer-facing homepage."
        >
          <GalleryGrid
            deleteAction={deleteAction}
            hasServiceKey={hasServiceKey}
            images={images}
            isDeleting={isDeleting}
            isLoading={isLoading}
          />
        </AdminPanel>
      </div>
    </>
  );
}
