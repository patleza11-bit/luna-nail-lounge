"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdminDatabase } from "@/app/admin/_lib/admin-database";
import {
  formatTimeForSlot,
  parseTimeToMinutes,
} from "@/app/admin/_lib/time-slots";
import { hasAdminSession } from "@/app/lib/admin-session";

export type QuickAddState = {
  error: string;
};

type SlotRow = {
  id: string;
  date?: string | null;
  time?: string | null;
  is_booked?: boolean | null;
};

const emptyState: QuickAddState = {
  error: "",
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function normalizeSlots(data: unknown[] | null) {
  return (data ?? []) as SlotRow[];
}

function isSameSlotTime(slot: SlotRow, date: string, time: string) {
  return (
    slot.date === date &&
    parseTimeToMinutes(slot.time ?? "") === parseTimeToMinutes(time)
  );
}

function isMissingOptionalColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.includes("column") ||
    error.message?.includes("Could not find")
  );
}

async function insertAppointmentWithFallback(
  client: NonNullable<ReturnType<typeof getSupabaseAdminDatabase>["client"]>,
  payload: Record<string, unknown>,
) {
  const firstAttempt = await client.insertAppointment(payload);

  if (!firstAttempt.error) {
    return firstAttempt;
  }

  if (!isMissingOptionalColumn(firstAttempt.error)) {
    return firstAttempt;
  }

  console.error(
    "Quick add optional appointment columns missing; retrying basic insert:",
    firstAttempt.error,
  );

  return client.insertAppointment({
    customer_name: payload.customer_name,
    phone: payload.phone,
    service: payload.service,
    slot_id: payload.slot_id,
  });
}

export async function createQuickAppointment(
  previousState: QuickAddState = emptyState,
  formData: FormData,
): Promise<QuickAddState> {
  void previousState;

  if (!(await hasAdminSession())) {
    redirect("/login");
  }

  const customerName = getFormString(formData, "customerName");
  const phone = getFormString(formData, "phone");
  const email = getFormString(formData, "email");
  const service = getFormString(formData, "service");
  const date = getFormString(formData, "date");
  const time = getFormString(formData, "time");
  const notes = getFormString(formData, "notes");
  const selectedSlotId = getFormString(formData, "slotId");

  if (!customerName || !phone || !service || !date || !time) {
    return {
      error: "Customer name, phone, service, date, and time are required.",
    };
  }

  const { client } = getSupabaseAdminDatabase();

  if (!client) {
    return { error: "Supabase admin access is not configured." };
  }

  const { data: dateSlots, error: slotsError } = await client.selectSlotsByDate(
    date,
  );

  if (slotsError) {
    console.error("Quick add slots lookup error:", slotsError);
    return { error: "Could not check availability for that date." };
  }

  const slots = normalizeSlots(dateSlots);
  const matchingSlots = selectedSlotId
    ? slots.filter((slot) => String(slot.id) === selectedSlotId)
    : slots.filter((slot) => isSameSlotTime(slot, date, time));
  const bookedMatch = matchingSlots.find((slot) => Boolean(slot.is_booked));

  if (bookedMatch) {
    return {
      error: "That time is already booked. Please choose another slot.",
    };
  }

  let claimedSlotId = "";
  let shouldRollbackSlot = false;
  const availableMatch = matchingSlots.find((slot) => !slot.is_booked);

  if (availableMatch) {
    const { data: claimedSlots, error: claimError } =
      await client.updateSlotBooked(String(availableMatch.id), true, true);

    if (claimError) {
      console.error("Quick add slot claim error:", claimError);
      return { error: "Could not reserve that slot. Please try again." };
    }

    const claimedSlot = normalizeSlots(claimedSlots)[0];

    if (!claimedSlot) {
      return {
        error: "That time was just booked. Please choose another slot.",
      };
    }

    claimedSlotId = String(claimedSlot.id);
    shouldRollbackSlot = true;
  } else {
    const { data: createdSlots, error: createSlotError } =
      await client.insertSlots([
        {
          date,
          time: formatTimeForSlot(time),
          is_booked: true,
        },
      ]);

    if (createSlotError) {
      console.error("Quick add slot create error:", createSlotError);
      return { error: "Could not create a booked slot for that time." };
    }

    const createdSlot = normalizeSlots(createdSlots)[0];

    if (!createdSlot) {
      return { error: "The slot was not created. Please try again." };
    }

    claimedSlotId = String(createdSlot.id);
    shouldRollbackSlot = true;
  }

  const appointmentPayload: Record<string, unknown> = {
    customer_name: customerName,
    phone,
    service,
    slot_id: claimedSlotId,
    status: "booked",
    ...(email ? { email } : {}),
    ...(notes ? { notes } : {}),
  };
  const { error: appointmentError } = await insertAppointmentWithFallback(
    client,
    appointmentPayload,
  );

  if (appointmentError) {
    console.error("Quick add appointment insert error:", appointmentError);

    if (shouldRollbackSlot) {
      await client.updateSlotBooked(claimedSlotId, false);
    }

    return { error: "Could not save the appointment. Please try again." };
  }

  redirect("/admin/calendar?appointment=created");
}
