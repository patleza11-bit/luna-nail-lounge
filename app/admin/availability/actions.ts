"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdminDatabase } from "@/app/admin/_lib/admin-database";
import {
  buildSlotTimes,
  eachDateInRange,
  getWeekdayIndex,
  isValidDateInput,
  parseTimeToMinutes,
} from "@/app/admin/_lib/time-slots";
import { hasAdminSession } from "@/app/lib/admin-session";

type SlotRow = {
  id: string;
  date?: string | null;
  time?: string | null;
  is_booked?: boolean | null;
};

type BlackoutRow = {
  date?: string | null;
};

type AdminDatabaseClient = NonNullable<
  ReturnType<typeof getSupabaseAdminDatabase>["client"]
>;
type SlotPayload = {
  date: string;
  is_booked: false;
  service_type?: string;
  time: string;
};

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(message: string, count?: number): never {
  const params = new URLSearchParams({ message });

  if (typeof count === "number") {
    params.set("count", String(count));
  }

  redirect(`/admin/availability?${params.toString()}`);
}

async function getAdminClient() {
  if (!(await hasAdminSession())) {
    redirect("/login");
  }

  const { client } = getSupabaseAdminDatabase();

  return client;
}

function isSameSlotTime(slot: SlotRow, time: string) {
  return parseTimeToMinutes(slot.time ?? "") === parseTimeToMinutes(time);
}

function normalizeSlots(data: unknown[] | null) {
  return (data ?? []) as SlotRow[];
}

function normalizeBlackoutDates(data: unknown[] | null) {
  return (data ?? []) as BlackoutRow[];
}

function isMissingBlackoutTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.message?.includes("blackout_dates") ||
    error.message?.includes("Could not find the table")
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

function normalizeServiceType(serviceType: string) {
  return serviceType && serviceType !== "Any service" ? serviceType : "";
}

async function fetchBlackoutDateSet(client: AdminDatabaseClient) {
  const { data, error } = await client.selectBlackoutDates();

  if (error) {
    console.error("Availability blackout lookup error:", error);
    return new Set<string>();
  }

  return new Set(
    normalizeBlackoutDates(data)
      .map((blackout) => blackout.date)
      .filter((date): date is string => Boolean(date)),
  );
}

async function buildMissingSlotPayloads(
  client: AdminDatabaseClient,
  dates: string[],
  times: string[],
  serviceType = "",
) {
  const payloads: SlotPayload[] = [];

  for (const date of dates) {
    const { data, error } = await client.selectSlotsByDate(date);

    if (error) {
      console.error("Availability slot lookup error:", error);
      return { payloads: [], error };
    }

    const existingSlots = normalizeSlots(data);

    for (const time of times) {
      if (!existingSlots.some((slot) => isSameSlotTime(slot, time))) {
        payloads.push({
          date,
          time,
          is_booked: false,
          ...(serviceType ? { service_type: serviceType } : {}),
        });
      }
    }
  }

  return { payloads, error: null };
}

async function insertSlotsWithFallback(
  client: AdminDatabaseClient,
  payloads: SlotPayload[],
) {
  const firstAttempt = await client.insertSlots(payloads);

  if (
    !firstAttempt.error ||
    !payloads.some((payload) => payload.service_type) ||
    !isMissingOptionalColumn(firstAttempt.error)
  ) {
    return firstAttempt;
  }

  console.error(
    "Availability service_type column missing; retrying slot insert without it:",
    firstAttempt.error,
  );

  return client.insertSlots(
    payloads.map(({ date, is_booked, time }) => ({ date, is_booked, time })),
  );
}

export async function addAvailableSlots(formData: FormData) {
  const client = await getAdminClient();

  if (!client) {
    redirectWithMessage("supabase-missing");
  }

  const date = getFormString(formData, "date");
  const startTime = getFormString(formData, "startTime");
  const endTime = getFormString(formData, "endTime");
  const serviceType = normalizeServiceType(
    getFormString(formData, "serviceType"),
  );

  if (!isValidDateInput(date) || !startTime || !endTime) {
    redirectWithMessage("slots-invalid");
  }

  const times = buildSlotTimes(startTime, endTime, 60);

  if (times.length === 0) {
    redirectWithMessage("slots-invalid");
  }

  const { payloads, error } = await buildMissingSlotPayloads(client, [
    date,
  ], times, serviceType);

  if (error) {
    redirectWithMessage("slots-error");
  }

  if (payloads.length === 0) {
    redirectWithMessage("slots-duplicate");
  }

  const { error: insertError } = await insertSlotsWithFallback(client, payloads);

  if (insertError) {
    console.error("Availability slot insert error:", insertError);
    redirectWithMessage("slots-error");
  }

  redirectWithMessage("slots-added", payloads.length);
}

export async function bulkAddAvailability(formData: FormData) {
  const client = await getAdminClient();

  if (!client) {
    redirectWithMessage("supabase-missing");
  }

  const startDate = getFormString(formData, "startDate");
  const endDate = getFormString(formData, "endDate");
  const startTime = getFormString(formData, "bulkStartTime");
  const endTime = getFormString(formData, "bulkEndTime");
  const interval = Number(getFormString(formData, "interval") || "60");
  const selectedWeekdays = new Set(
    formData
      .getAll("weekdays")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
  );

  if (
    !isValidDateInput(startDate) ||
    !isValidDateInput(endDate) ||
    !startTime ||
    !endTime ||
    selectedWeekdays.size === 0
  ) {
    redirectWithMessage("bulk-invalid");
  }

  const times = buildSlotTimes(startTime, endTime, interval);

  if (times.length === 0) {
    redirectWithMessage("bulk-invalid");
  }

  const blackoutDates = await fetchBlackoutDateSet(client);
  const dates = eachDateInRange(startDate, endDate).filter(
    (date) =>
      selectedWeekdays.has(getWeekdayIndex(date)) && !blackoutDates.has(date),
  );

  if (dates.length === 0) {
    redirectWithMessage("bulk-no-dates");
  }

  if (dates.length * times.length > 500) {
    redirectWithMessage("bulk-too-many");
  }

  const { payloads, error } = await buildMissingSlotPayloads(
    client,
    dates,
    times,
  );

  if (error) {
    redirectWithMessage("bulk-error");
  }

  if (payloads.length === 0) {
    redirectWithMessage("bulk-duplicate");
  }

  const { error: insertError } = await insertSlotsWithFallback(client, payloads);

  if (insertError) {
    console.error("Bulk availability insert error:", insertError);
    redirectWithMessage("bulk-error");
  }

  redirectWithMessage("bulk-added", payloads.length);
}

export async function addBlackoutDate(formData: FormData) {
  const client = await getAdminClient();

  if (!client) {
    redirectWithMessage("supabase-missing");
  }

  const date = getFormString(formData, "blackoutDate");
  const reason = getFormString(formData, "reason");

  if (!isValidDateInput(date)) {
    redirectWithMessage("blackout-invalid");
  }

  const { error: markError } = await client.markDateUnavailable(date);

  if (markError) {
    console.error("Availability blackout slot update error:", markError);
    redirectWithMessage("blackout-error");
  }

  const { error: insertError } = await client.insertBlackoutDate({
    date,
    ...(reason ? { reason } : {}),
  });

  if (insertError) {
    console.error("Availability blackout date insert error:", insertError);

    if (isMissingBlackoutTable(insertError)) {
      redirectWithMessage("blackout-limited");
    }

    redirectWithMessage("blackout-error");
  }

  redirectWithMessage("blackout-added");
}
