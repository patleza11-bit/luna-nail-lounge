import {
  AdminPageHeader,
  AdminPanel,
} from "@/app/admin/_components/admin-page-shell";
import { getSupabaseAdminDatabase } from "@/app/admin/_lib/admin-database";
import { parseTimeToMinutes } from "@/app/admin/_lib/time-slots";
import {
  addAvailableSlots,
  addBlackoutDate,
  bulkAddAvailability,
} from "@/app/admin/availability/actions";

type SlotRow = {
  id: string;
  date?: string | null;
  time?: string | null;
  is_booked?: boolean | null;
};

type BlackoutRow = {
  id?: string | number;
  date?: string | null;
  reason?: string | null;
};

type SlotGroup = {
  date: string;
  slots: SlotRow[];
};

const messages = {
  "slots-added": "Availability added.",
  "slots-duplicate": "Those times already exist.",
  "slots-error": "Availability could not be saved.",
  "slots-invalid": "Enter a valid date and time window.",
  "bulk-added": "Recurring availability added.",
  "bulk-duplicate": "No new recurring slots were needed.",
  "bulk-error": "Recurring availability could not be saved.",
  "bulk-invalid": "Complete the recurring availability fields.",
  "bulk-no-dates": "No dates matched that recurring pattern.",
  "bulk-too-many": "Please add fewer than 500 slots at once.",
  "blackout-added": "Blackout date saved.",
  "blackout-error": "Blackout date could not be saved.",
  "blackout-invalid": "Enter a valid blackout date.",
  "blackout-limited":
    "Open slots were closed for that date. Add the blackout_dates table below to persist blackout reasons.",
  "supabase-missing": "Supabase is not configured for admin writes.",
} as const;

type AvailabilityPageProps = {
  searchParams: Promise<{
    count?: string;
    message?: string;
  }>;
};

const weekdays = [
  { label: "Mon", value: "1" },
  { label: "Tue", value: "2" },
  { label: "Wed", value: "3" },
  { label: "Thu", value: "4" },
  { label: "Fri", value: "5" },
  { label: "Sat", value: "6" },
  { label: "Sun", value: "0" },
];

const serviceOptions = [
  "Any service",
  "Gel Manicure",
  "Acrylic Full Set",
  "Deluxe Pedicure",
  "Nail Art Design",
];

const blackoutSql = `create table blackout_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

alter table available_slots2 add column service_type text;`;

const fieldClass =
  "mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]";
const labelClass = "text-sm font-medium text-[#5f544f]";
const buttonClass =
  "min-h-12 rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function parseSlotDate(date: string) {
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function formatDate(date: string) {
  return dateFormatter.format(parseSlotDate(date));
}

function sortSlots(first: SlotRow, second: SlotRow) {
  return parseTimeToMinutes(first.time ?? "") - parseTimeToMinutes(second.time ?? "");
}

function groupSlots(slots: SlotRow[]) {
  const groups = slots.reduce<Record<string, SlotRow[]>>((accumulator, slot) => {
    if (!slot.date || !slot.time) {
      return accumulator;
    }

    accumulator[slot.date] = [...(accumulator[slot.date] ?? []), slot];
    return accumulator;
  }, {});

  return Object.entries(groups)
    .map(([date, groupedSlots]) => ({
      date,
      slots: groupedSlots.sort(sortSlots),
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
}

function normalizeSlots(data: unknown[] | null) {
  return ((data ?? []) as SlotRow[]).filter((slot) => slot.date && slot.time);
}

function normalizeBlackouts(data: unknown[] | null) {
  return ((data ?? []) as BlackoutRow[]).filter((blackout) => blackout.date);
}

function getUnavailableDateGroups(slots: SlotRow[]) {
  const groupedDates = new Map<string, number>();

  for (const slot of slots) {
    if (slot.date) {
      groupedDates.set(slot.date, (groupedDates.get(slot.date) ?? 0) + 1);
    }
  }

  return Array.from(groupedDates.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 8);
}

function MessageBanner({
  count,
  message,
}: {
  count?: string;
  message?: string;
}) {
  if (!message || !(message in messages)) {
    return null;
  }

  const messageKey = message as keyof typeof messages;
  const tone = messageKey.includes("error") || messageKey.includes("invalid");

  return (
    <div
      className={`mb-5 rounded-lg border p-4 text-sm ${
        tone
          ? "border-[#e8beb6] bg-[#fff2ef] text-[#9f3f36]"
          : "border-[#d8bcb2] bg-[#fff7f8] text-[#6f4f45]"
      }`}
      role={tone ? "alert" : "status"}
    >
      {messages[messageKey]}
      {count ? ` ${count} slot${count === "1" ? "" : "s"}.` : ""}
    </div>
  );
}

function AddSlotsForm() {
  return (
    <form action={addAvailableSlots} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>Date</span>
        <input className={fieldClass} name="date" required type="date" />
      </label>

      <label className="block">
        <span className={labelClass}>Service type optional</span>
        <select className={fieldClass} name="serviceType">
          {serviceOptions.map((service) => (
            <option key={service}>{service}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Start time</span>
        <input className={fieldClass} name="startTime" required type="time" />
      </label>

      <label className="block">
        <span className={labelClass}>End time</span>
        <input className={fieldClass} name="endTime" required type="time" />
      </label>

      <div className="sm:col-span-2">
        <button className={`${buttonClass} w-full`} type="submit">
          Add slots
        </button>
      </div>
    </form>
  );
}

function BulkAvailabilityForm() {
  return (
    <form action={bulkAddAvailability} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>Start date</span>
        <input className={fieldClass} name="startDate" required type="date" />
      </label>

      <label className="block">
        <span className={labelClass}>End date</span>
        <input className={fieldClass} name="endDate" required type="date" />
      </label>

      <fieldset className="sm:col-span-2">
        <legend className={labelClass}>Weekdays</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {weekdays.map((day) => (
            <label
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-[#eadbd1] bg-[#fffaf6] px-3 text-sm font-semibold text-[#5f544f] transition has-[:checked]:border-[#2f2824] has-[:checked]:bg-[#2f2824] has-[:checked]:text-white"
              key={day.value}
            >
              <input
                className="sr-only"
                defaultChecked={day.value !== "0"}
                name="weekdays"
                type="checkbox"
                value={day.value}
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={labelClass}>Start time</span>
        <input
          className={fieldClass}
          name="bulkStartTime"
          required
          type="time"
        />
      </label>

      <label className="block">
        <span className={labelClass}>End time</span>
        <input
          className={fieldClass}
          name="bulkEndTime"
          required
          type="time"
        />
      </label>

      <label className="block sm:col-span-2">
        <span className={labelClass}>Appointment interval</span>
        <select className={fieldClass} defaultValue="60" name="interval">
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
        </select>
      </label>

      <div className="sm:col-span-2">
        <button className={`${buttonClass} w-full`} type="submit">
          Add recurring slots
        </button>
      </div>
    </form>
  );
}

function BlackoutForm() {
  return (
    <form action={addBlackoutDate} className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className={labelClass}>Blackout date</span>
        <input
          className={fieldClass}
          name="blackoutDate"
          required
          type="date"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Reason optional</span>
        <input
          className={fieldClass}
          name="reason"
          placeholder="Holiday, private event, personal day"
          type="text"
        />
      </label>

      <div className="sm:col-span-2">
        <button className={`${buttonClass} w-full`} type="submit">
          Save blackout date
        </button>
      </div>
    </form>
  );
}

function AvailabilityList({ groups }: { groups: SlotGroup[] }) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-5 text-sm text-[#6f625b]">
        No open availability is currently listed.
      </p>
    );
  }

  return (
    <div className="luxury-scrollbar grid max-h-[340px] gap-3 overflow-y-auto overscroll-contain pr-2 sm:max-h-[420px]">
      {groups.slice(0, 10).map((group) => (
        <article
          className="rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-4"
          key={group.date}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#2f2824]">
              {formatDate(group.date)}
            </h3>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8c5751]">
              {group.slots.length} open
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.slots.map((slot) => (
              <span
                className="rounded-full border border-[#d8bcb2] bg-white px-3 py-2 text-sm font-medium text-[#5f544f]"
                key={slot.id}
              >
                {slot.time}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function BlackoutList({
  blackouts,
  hasBlackoutTable,
  unavailableDates,
}: {
  blackouts: BlackoutRow[];
  hasBlackoutTable: boolean;
  unavailableDates: Array<{ count: number; date: string }>;
}) {
  if (hasBlackoutTable && blackouts.length > 0) {
    return (
      <div className="grid gap-3">
        {blackouts.map((blackout) => (
          <article
            className="rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-4"
            key={String(blackout.id ?? blackout.date)}
          >
            <h3 className="font-semibold text-[#2f2824]">
              {formatDate(String(blackout.date))}
            </h3>
            {blackout.reason ? (
              <p className="mt-2 text-sm text-[#6f625b]">{blackout.reason}</p>
            ) : null}
          </article>
        ))}
      </div>
    );
  }

  if (!hasBlackoutTable && unavailableDates.length > 0) {
    return (
      <div className="grid gap-3">
        {unavailableDates.map((date) => (
          <article
            className="rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-4"
            key={date.date}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#2f2824]">
                {formatDate(date.date)}
              </h3>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8c5751]">
                {date.count} unavailable
              </span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <p className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-5 text-sm text-[#6f625b]">
      No blackout dates are currently listed.
    </p>
  );
}

export default async function AdminAvailabilityPage({
  searchParams,
}: AvailabilityPageProps) {
  const params = await searchParams;
  const { client, hasServiceKey } = getSupabaseAdminDatabase();
  const [{ data: openSlotData, error: openSlotError }, bookedSlotResult] =
    client
      ? await Promise.all([
          client.selectAvailableSlots(),
          client.selectBookedSlots(),
        ])
      : [
          { data: null, error: { message: "Supabase is not configured." } },
          { data: null, error: { message: "Supabase is not configured." } },
        ];
  const blackoutResult = client
    ? await client.selectBlackoutDates()
    : { data: null, error: { message: "Supabase is not configured." } };

  if (openSlotError) {
    console.error("Availability open slots load error:", openSlotError);
  }

  if (bookedSlotResult.error) {
    console.error("Availability booked slots load error:", bookedSlotResult.error);
  }

  if (blackoutResult.error) {
    console.error("Availability blackout dates load error:", blackoutResult.error);
  }

  const openSlotGroups = groupSlots(normalizeSlots(openSlotData));
  const hasBlackoutTable = !blackoutResult.error;
  const blackouts = normalizeBlackouts(blackoutResult.data);
  const unavailableDates = getUnavailableDateGroups(
    normalizeSlots(bookedSlotResult.data),
  );

  return (
    <>
      <AdminPageHeader
        eyebrow="Availability"
        title="Manage Availability"
        description="Open appointment times, repeat them across the week, and block dates from booking."
      />

      <MessageBanner count={params.count} message={params.message} />

      {!hasServiceKey ? (
        <div className="mb-5 rounded-lg border border-[#e4c1cf] bg-[#fff7f8] p-4 text-sm leading-6 text-[#6f4f45]">
          <p className="font-semibold text-[#2f2824]">
            Admin writes are using the anon key until a service role key is set.
          </p>
          <p className="mt-1">
            Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>{" "}
            for reliable owner-only availability changes with RLS enabled.
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel
          title="Add available slots"
          description="A one-day window creates 60-minute appointment slots."
        >
          <AddSlotsForm />
        </AdminPanel>

        <AdminPanel
          title="Bulk recurring availability"
          description="Repeat open times across selected weekdays."
        >
          <BulkAvailabilityForm />
        </AdminPanel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel
          title="Blackout dates"
          description="Close open slots for holidays, events, or personal days."
        >
          <BlackoutForm />

          {!hasBlackoutTable ? (
            <div className="mt-5 rounded-lg border border-[#e4c1cf] bg-[#fff7f8] p-4 text-sm leading-6 text-[#6f4f45]">
              <p className="font-semibold text-[#2f2824]">
                Optional SQL for persistent blackout reasons and service types
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs leading-5 text-[#5f544f]">
                <code>{blackoutSql}</code>
              </pre>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel
          title="Current open availability"
          description={
            openSlotError
              ? "Open slots could not be loaded."
              : "Upcoming bookable times from available_slots2."
          }
        >
          <AvailabilityList groups={openSlotGroups} />
        </AdminPanel>
      </div>

      <div className="mt-5">
        <AdminPanel
          title="Blackout and unavailable dates"
          description={
            hasBlackoutTable
              ? "Saved blackout dates."
              : "Booked or closed slots shown until the blackout_dates table is added."
          }
        >
          <BlackoutList
            blackouts={blackouts}
            hasBlackoutTable={hasBlackoutTable}
            unavailableDates={unavailableDates}
          />
        </AdminPanel>
      </div>
    </>
  );
}
