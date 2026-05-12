import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/app/admin/_components/admin-page-shell";
import { GalleryManager } from "@/app/admin/gallery/_components/gallery-manager";
import { getGalleryServiceStatus } from "@/app/admin/gallery/_lib/gallery-supabase";

export const metadata: Metadata = {
  title: "Gallery Admin | Beauty Nail Lounge",
  description: "Upload and manage Beauty Nail Lounge public gallery images.",
};

type GalleryPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AdminGalleryPage({
  searchParams,
}: GalleryPageProps) {
  const params = await searchParams;

  return (
    <>
      <AdminPageHeader
        eyebrow="Gallery"
        title="Manage Gallery"
        description="Upload finished nail looks for the public homepage gallery."
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#d8bcb2] px-4 text-sm font-semibold text-[#6f4f45] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            href="/#gallery"
          >
            View public gallery
          </Link>
        }
      />

      <GalleryManager
        hasServiceKey={getGalleryServiceStatus()}
        initialMessage={params.message}
      />
    </>
  );
}
