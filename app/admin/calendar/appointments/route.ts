import { NextResponse } from "next/server";
import { hasAdminSession } from "@/app/lib/admin-session";
import { getSupabaseAdminDatabase } from "@/app/admin/_lib/admin-database";
import { fetchCalendarAppointments } from "@/app/admin/calendar/_lib/appointments-api";
import {
  appointmentStatuses,
  getSchemaSql,
} from "@/app/admin/calendar/_lib/calendar-utils";
import type {
  AppointmentDataNotice,
  AppointmentStatus,
} from "@/app/admin/calendar/_lib/calendar-types";

function serializeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const errorRecord = error as Record<string, unknown>;

  return {
    name: errorRecord.name,
    message: errorRecord.message,
    code: errorRecord.code,
    details: errorRecord.details,
    hint: errorRecord.hint,
    stack: errorRecord.stack,
  };
}

async function getBookedSlotWarning(
  client: NonNullable<ReturnType<typeof getSupabaseAdminDatabase>["client"]>,
  appointmentCount: number,
  hasServiceKey: boolean,
) {
  if (appointmentCount > 0 || hasServiceKey) {
    return null;
  }

  const { data, error } = await client.selectBookedSlots();

  if (error || !data?.length) {
    return null;
  }

  return {
    type: "warning",
    message:
      "Booked slots exist, but appointment rows are hidden from this admin request.",
    detail:
      "This usually means RLS allows public booking inserts but blocks appointment selects. Add SUPABASE_SERVICE_ROLE_KEY to .env.local for the passcode-protected admin API, or add a temporary read policy for appointments.",
  } satisfies AppointmentDataNotice;
}

function getRlsNotice(hasServiceKey: boolean) {
  if (hasServiceKey) {
    return null;
  }

  return {
    type: "warning",
    message: "Admin appointments are currently reading with the public anon key.",
    detail:
      "For the temporary passcode admin, add SUPABASE_SERVICE_ROLE_KEY to .env.local so this protected route can read appointments without exposing customer data publicly.",
  } satisfies AppointmentDataNotice;
}

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client, hasServiceKey } = getSupabaseAdminDatabase();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase is not configured for admin appointments." },
      { status: 500 },
    );
  }

  try {
    const result = await fetchCalendarAppointments(client);
    const notices = [...result.notices];
    const rlsNotice = getRlsNotice(hasServiceKey);
    const bookedSlotWarning = await getBookedSlotWarning(
      client,
      result.appointments.length,
      hasServiceKey,
    );

    if (rlsNotice) {
      notices.push(rlsNotice);
    }

    if (bookedSlotWarning) {
      notices.push(bookedSlotWarning);
    }

    return NextResponse.json({
      ...result,
      notices,
    });
  } catch (error) {
    console.error(
      "Admin appointments API exact error:",
      JSON.stringify(serializeError(error), null, 2),
    );

    return NextResponse.json(
      {
        error: "Appointments could not be loaded.",
        detail: serializeError(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client } = getSupabaseAdminDatabase();

  if (!client) {
    return NextResponse.json(
      { error: "Supabase is not configured for admin appointments." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    id?: string;
    status?: AppointmentStatus;
  };

  const nextStatus = body.status;

  if (!body.id || !appointmentStatuses.includes(nextStatus as AppointmentStatus)) {
    return NextResponse.json(
      { error: "A valid appointment id and status are required." },
      { status: 400 },
    );
  }

  const { error } = await client.updateAppointmentStatus(
    body.id,
    nextStatus as AppointmentStatus,
  );

  if (error) {
    console.error("Supabase appointment status exact error:", error);

    const isMissingStatus = error.code === "42703";

    return NextResponse.json(
      {
        error: isMissingStatus
          ? "appointments.status does not exist yet."
          : "Appointment status could not be updated.",
        sql: isMissingStatus ? getSchemaSql() : undefined,
      },
      { status: isMissingStatus ? 400 : 500 },
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
