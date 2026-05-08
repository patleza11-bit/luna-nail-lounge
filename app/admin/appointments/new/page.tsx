import {
  AdminPageHeader,
  AdminPanel,
} from "@/app/admin/_components/admin-page-shell";
import { getSupabaseAdminDatabase } from "@/app/admin/_lib/admin-database";
import {
  QuickAddForm,
  type AvailableSlotOption,
} from "@/app/admin/appointments/new/_components/quick-add-form";

function normalizeAvailableSlots(data: unknown[] | null) {
  return ((data ?? []) as Array<{
    id: string;
    date?: string | null;
    time?: string | null;
  }>)
    .filter((slot) => slot.id && slot.date && slot.time)
    .map(
      (slot) =>
        ({
          id: String(slot.id),
          date: String(slot.date),
          time: String(slot.time),
        }) satisfies AvailableSlotOption,
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.time.localeCompare(second.time),
    );
}

export default async function NewAppointmentPage() {
  const { client, hasServiceKey } = getSupabaseAdminDatabase();
  const { data, error } = client
    ? await client.selectAvailableSlots()
    : { data: null, error: { message: "Supabase is not configured." } };
  const availableSlots = normalizeAvailableSlots(data);

  return (
    <>
      <AdminPageHeader
        eyebrow="Appointments"
        title="Quick Add"
        description="Add a client visit quickly, claim an open slot when one exists, or create a manual booked time."
      />

      {!hasServiceKey ? (
        <div className="mb-5 rounded-lg border border-[#e4c1cf] bg-[#fff7f8] p-4 text-sm leading-6 text-[#6f4f45]">
          <p className="font-semibold text-[#2f2824]">
            Admin writes are using the anon key until a service role key is set.
          </p>
          <p className="mt-1">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>{" "}
            for reliable owner-only writes with RLS enabled.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 rounded-lg border border-[#e8beb6] bg-[#fff2ef] p-4 text-sm text-[#9f3f36]">
          Open slots could not be loaded, but manual appointment entry is still
          available.
        </div>
      ) : null}

      <AdminPanel
        title="Appointment details"
        description="Large, phone-friendly fields for adding a client between services."
      >
        <QuickAddForm availableSlots={availableSlots} />
      </AdminPanel>
    </>
  );
}
