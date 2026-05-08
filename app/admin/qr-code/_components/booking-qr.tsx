"use client";

import { QRCodeSVG } from "qrcode.react";
import { useMemo } from "react";

type BookingQrProps = {
  bookingUrl: string;
};

function resolveBookingUrl(bookingUrl: string) {
  if (/^https?:\/\//i.test(bookingUrl)) {
    return bookingUrl;
  }

  if (typeof window === "undefined") {
    return bookingUrl;
  }

  return new URL(bookingUrl, window.location.origin).toString();
}

export function BookingQr({ bookingUrl }: BookingQrProps) {
  const resolvedBookingUrl = useMemo(
    () => resolveBookingUrl(bookingUrl),
    [bookingUrl],
  );

  const handleDownload = () => {
    const svg = document.getElementById("luna-booking-qr");

    if (!svg) {
      return;
    }

    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "luna-booking-qr.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
        <section
          className="mx-auto flex w-full max-w-[46rem] flex-col items-center justify-between rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-6 text-center shadow-sm shadow-[#eadbd1]/35 sm:min-h-[44rem] sm:p-10"
          id="luna-qr-print"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
              Luna Nail Lounge
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-[#2f2824] sm:text-5xl">
              Scan to book your next appointment
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#6f625b]">
              Choose a time online and send your appointment request before you
              leave the salon.
            </p>
          </div>

          <div className="my-8 rounded-lg border border-[#eadbd1] bg-white p-5 shadow-lg shadow-[#d8bcb2]/35">
            <QRCodeSVG
              bgColor="#ffffff"
              fgColor="#2f2824"
              id="luna-booking-qr"
              level="H"
              marginSize={3}
              size={260}
              value={resolvedBookingUrl}
            />
          </div>

          <div className="w-full rounded-lg border border-[#eadbd1] bg-white px-4 py-4">
            <p className="text-sm font-semibold text-[#2f2824]">
              {resolvedBookingUrl}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6f625b]">
              Point your camera at the code and tap the booking link.
            </p>
          </div>
        </section>

        <aside className="luna-qr-actions grid gap-3 rounded-lg bg-[#fffaf6] p-4">
          <button
            className="min-h-12 rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            onClick={handleDownload}
            type="button"
          >
            Download QR code
          </button>
          <button
            className="min-h-12 rounded-lg border border-[#d8bcb2] bg-white px-5 text-sm font-semibold text-[#6f4f45] transition hover:border-[#b98a7d] hover:text-[#8c5751] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            onClick={() => window.print()}
            type="button"
          >
            Print flyer
          </button>
        </aside>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 0;
            size: letter;
          }

          body {
            background: #fffaf6 !important;
          }

          body * {
            visibility: hidden !important;
          }

          #luna-qr-print,
          #luna-qr-print * {
            visibility: visible !important;
          }

          #luna-qr-print {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            inset: 0 !important;
            min-height: 11in !important;
            padding: 0.75in !important;
            position: absolute !important;
            width: 8.5in !important;
          }

          .luna-qr-actions {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
