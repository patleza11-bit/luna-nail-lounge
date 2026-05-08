import {
  AdminPageHeader,
} from "@/app/admin/_components/admin-page-shell";
import { AppointmentCalendarClient } from "@/app/admin/calendar/_components/appointment-calendar-client";

type AdminCalendarPageProps = {
  searchParams: Promise<{
    appointment?: string;
  }>;
};

export default async function AdminCalendarPage({
  searchParams,
}: AdminCalendarPageProps) {
  const params = await searchParams;

  return (
    <>
      <AdminPageHeader
        eyebrow="Calendar"
        title="Appointments"
        description="Review bookings from the existing Supabase appointments table, with a phone-first agenda and desktop calendar views."
      />

      {params.appointment === "created" ? (
        <div className="mb-5 rounded-lg border border-[#d8bcb2] bg-[#fff7f8] p-4 text-sm font-medium text-[#6f4f45]">
          Appointment saved.
        </div>
      ) : null}

      <AppointmentCalendarClient />
    </>
  );
}
