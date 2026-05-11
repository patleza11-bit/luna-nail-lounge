import Link from "next/link";
import {
  AdminPageHeader,
  AdminPanel,
} from "@/app/admin/_components/admin-page-shell";

const dashboardCards = [
  {
    title: "Today's appointments",
    description: "See the salon day at a glance.",
    href: "/admin/calendar#today",
    accent: "bg-[#f7d8d0]",
  },
  {
    title: "Upcoming appointments",
    description: "Review the next visits on the books.",
    href: "/admin/calendar#upcoming",
    accent: "bg-[#dfe8d6]",
  },
  {
    title: "Manage availability",
    description: "Shape the times clients can request.",
    href: "/admin/availability",
    accent: "bg-[#f4e5dd]",
  },
  {
    title: "Gallery images",
    description: "Upload nail looks for the public homepage.",
    href: "/admin/gallery",
    accent: "bg-[#f7d8d0]",
  },
  {
    title: "Quick add appointment",
    description: "Start a new appointment by hand.",
    href: "/admin/appointments/new",
    accent: "bg-[#eadbd1]",
  },
  {
    title: "QR code for booking",
    description: "Open the booking QR placeholder.",
    href: "/admin/qr-code",
    accent: "bg-[#f8efe9]",
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Owner area"
        title="Admin"
        description="A soft, simple starting point for managing the Luna Nail Lounge booking flow."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => (
          <Link
            className="group flex min-h-44 flex-col rounded-lg border border-[#eadbd1] bg-white p-5 shadow-sm shadow-[#eadbd1]/35 transition hover:-translate-y-1 hover:border-[#d6a9a1] hover:shadow-lg hover:shadow-[#d8bcb2]/35 focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            href={card.href}
            key={card.title}
          >
            <span className={`mb-5 h-2 w-14 rounded-full ${card.accent}`} />
            <h2 className="text-lg font-semibold leading-6 text-[#2f2824]">
              {card.title}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-[#6f625b]">
              {card.description}
            </p>
            <span className="mt-5 text-sm font-semibold text-[#9f635d] transition group-hover:text-[#2f2824]">
              Open
            </span>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel
          title="Today at a glance"
          description="Live appointment data will land here once the admin data layer is connected."
        >
          <div className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] p-5 text-sm leading-6 text-[#6f625b]">
            No admin appointment feed is connected yet. The public booking flow
            remains unchanged.
          </div>
        </AdminPanel>

        <AdminPanel
          title="Phase 1 status"
          description="The admin routes, navigation, and placeholder auth shell are ready for owner review."
        >
          <ul className="space-y-3 text-sm leading-6 text-[#5f544f]">
            <li className="rounded-lg bg-[#fffaf6] px-4 py-3">
              Protected admin routes redirect to <code>/login</code>.
            </li>
            <li className="rounded-lg bg-[#fffaf6] px-4 py-3">
              Database tables have not been changed.
            </li>
            <li className="rounded-lg bg-[#fffaf6] px-4 py-3">
              Supabase Auth can replace the temporary passcode gate next.
            </li>
          </ul>
        </AdminPanel>
      </div>
    </>
  );
}
