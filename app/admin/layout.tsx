import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAdmin } from "@/app/admin/actions";
import { requireAdminSession } from "@/app/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin | Luna Nail Lounge",
  description: "Owner tools for Luna Nail Lounge appointments and availability.",
};

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Availability", href: "/admin/availability" },
  { label: "New Appointment", href: "/admin/appointments/new" },
  { label: "QR Code", href: "/admin/qr-code" },
];

function AdminNavLinks({ variant }: { variant: "mobile" | "desktop" }) {
  const mobileClasses =
    "shrink-0 border border-[#eadbd1] bg-white text-[#5f544f] shadow-sm shadow-[#eadbd1]/35 hover:border-[#d6a9a1] hover:text-[#8c5751]";
  const desktopClasses =
    "text-[#5f544f] hover:bg-[#f8efe9] hover:text-[#8c5751]";

  return navItems.map((item) => (
    <Link
      className={`flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
        variant === "mobile" ? mobileClasses : desktopClasses
      }`}
      href={item.href}
      key={item.href}
    >
      {item.label}
    </Link>
  ));
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await requireAdminSession();

  return (
    <section className="min-h-screen bg-[#fffaf6] text-[#2f2824]">
      <header className="sticky top-0 z-40 border-b border-[#eadbd1] bg-[#fffaf6]/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link className="font-semibold text-[#2f2824]" href="/admin">
            Luna Admin
          </Link>
          <form action={signOutAdmin}>
            <button
              className="min-h-11 rounded-lg border border-[#d8bcb2] px-4 text-sm font-semibold text-[#6f4f45] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav
          aria-label="Admin navigation"
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
        >
          <AdminNavLinks variant="mobile" />
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[17rem_1fr]">
        <aside className="sticky top-0 hidden min-h-screen border-r border-[#eadbd1] bg-[#fffdfb] p-6 lg:flex lg:flex-col">
          <Link className="text-xl font-semibold text-[#2f2824]" href="/admin">
            Luna Nail Lounge
          </Link>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">
            Owner studio
          </p>

          <nav aria-label="Admin navigation" className="mt-8 grid gap-2">
            <AdminNavLinks variant="desktop" />
          </nav>

          <div className="mt-auto rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-4">
            <p className="text-sm leading-6 text-[#6f625b]">
              Soft tools for appointments, availability, and booking access.
            </p>
            <form action={signOutAdmin} className="mt-4">
              <button
                className="min-h-11 w-full rounded-lg bg-[#2f2824] px-4 text-sm font-semibold text-white transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </section>
  );
}
