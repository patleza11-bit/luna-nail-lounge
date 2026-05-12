import { headers } from "next/headers";
import Link from "next/link";
import {
  AdminPageHeader,
  AdminPanel,
} from "@/app/admin/_components/admin-page-shell";
import { BookingQr } from "@/app/admin/qr-code/_components/booking-qr";

function normalizeBaseUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function getBookingUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;

  if (configuredUrl) {
    return new URL("/book", normalizeBaseUrl(configuredUrl)).toString();
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return "/book";
  }

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}/book`;
}

export default async function QrCodePage() {
  const bookingUrl = await getBookingUrl();

  return (
    <>
      <AdminPageHeader
        eyebrow="Booking QR"
        title="QR Code"
        description="Print a soft Beauty Nail Lounge booking flyer clients can scan before they leave."
        action={
          <Link
            className="flex min-h-12 items-center justify-center rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            href="/book"
          >
            Open booking page
          </Link>
        }
      />

      <AdminPanel
        title="Printable booking flyer"
        description="The QR code points to the public booking page."
      >
        <BookingQr bookingUrl={bookingUrl} />
      </AdminPanel>
    </>
  );
}
