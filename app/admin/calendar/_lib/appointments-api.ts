import type {
  AppointmentCapabilities,
  AppointmentDataNotice,
  AppointmentQueryResult,
  AppointmentSlot,
  CalendarAppointment,
} from "@/app/admin/calendar/_lib/calendar-types";
import type { AppointmentDatabaseClient } from "@/app/admin/calendar/_lib/supabase-rest-client";
import {
  normalizeAppointmentStatus,
  parseAppointmentDateTime,
  sortAppointments,
} from "@/app/admin/calendar/_lib/calendar-utils";

type AppointmentRow = {
  id: number | string;
  customer_name: string | null;
  phone: string | null;
  service: string | null;
  slot_id: string | null;
  created_at: string | null;
  status?: string | null;
  notes?: string | null;
};

type SlotRow = {
  id: string;
  date: string | null;
  time: string | null;
  is_booked?: boolean | null;
};

function normalizeSlot(slotRow: SlotRow | null | undefined) {
  if (!slotRow?.date || !slotRow.time) {
    return null;
  }

  return {
    id: String(slotRow.id),
    date: slotRow.date,
    time: slotRow.time,
    isBooked: Boolean(slotRow.is_booked),
  } satisfies AppointmentSlot;
}

function normalizeAppointment(
  row: AppointmentRow,
  slotRow: SlotRow | null | undefined,
): CalendarAppointment {
  const slot = normalizeSlot(slotRow);
  const startsAt = slot ? parseAppointmentDateTime(slot.date, slot.time) : null;

  return {
    id: String(row.id),
    customerName: row.customer_name?.trim() || "Unnamed client",
    service: row.service?.trim() || "Service not set",
    phone: row.phone?.trim() || "",
    slotId: row.slot_id ?? "",
    createdAt: row.created_at ?? "",
    slot,
    status: normalizeAppointmentStatus(row.status),
    notes: row.notes?.trim() ?? "",
    startsAt,
  };
}

async function fetchAppointmentSlots(
  client: AppointmentDatabaseClient,
  rows: AppointmentRow[],
) {
  const slotIds = Array.from(
    new Set(
      rows
        .map((row) => row.slot_id)
        .filter((slotId): slotId is string => Boolean(slotId)),
    ),
  );
  const notices: AppointmentDataNotice[] = [];
  const slotsById = new Map<string, SlotRow>();

  if (slotIds.length === 0) {
    return { slotsById, notices };
  }

  const { data, error } = await client.selectSlotsByIds(slotIds);

  if (error) {
    console.error("Supabase available_slots2 exact error:", error);

    notices.push({
      type: "warning",
      message: "Appointments loaded, but slot date/time could not be joined.",
      detail: error.message,
    });

    return { slotsById, notices };
  }

  const slotRows = (data ?? []) as unknown as SlotRow[];

  for (const slotRow of slotRows) {
    slotsById.set(String(slotRow.id), slotRow);
  }

  return { slotsById, notices };
}

async function queryAppointments(
  client: AppointmentDatabaseClient,
): Promise<AppointmentQueryResult> {
  const { data, error } = await client.selectAppointments();

  if (error) {
    console.error("Supabase appointments exact error:", error);
    throw error;
  }

  const rows = (data ?? []) as unknown as AppointmentRow[];
  const { slotsById, notices } = await fetchAppointmentSlots(client, rows);
  const capabilities: AppointmentCapabilities = {
    hasStatus: rows.some((row) =>
      Object.prototype.hasOwnProperty.call(row, "status"),
    ),
    hasNotes: rows.some((row) =>
      Object.prototype.hasOwnProperty.call(row, "notes"),
    ),
  };

  return {
    appointments: sortAppointments(
      rows.map((row) =>
        normalizeAppointment(
          row,
          row.slot_id ? slotsById.get(row.slot_id) : null,
        ),
      ),
    ),
    capabilities,
    notices,
  };
}

export async function fetchCalendarAppointments(
  client: AppointmentDatabaseClient,
): Promise<AppointmentQueryResult> {
  return queryAppointments(client);
}
