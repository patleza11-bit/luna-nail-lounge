import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { AppointmentStatus } from "@/app/admin/calendar/_lib/calendar-types";

export type SupabaseRestError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
  cause?: unknown;
};

export type AppointmentDatabaseClient = {
  hasServiceKey: boolean;
  selectAppointments: () => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  insertAppointment: (payload: Record<string, unknown>) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  selectSlotsByIds: (slotIds: string[]) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  selectAvailableSlots: () => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  selectSlotsByDate: (date: string) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  insertSlots: (slots: Record<string, unknown>[]) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  updateSlotBooked: (
    slotId: string,
    isBooked: boolean,
    onlyIfAvailable?: boolean,
  ) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  markDateUnavailable: (date: string) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  selectBookedSlots: () => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  updateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentStatus,
  ) => Promise<{
    error: SupabaseRestError | null;
  }>;
  selectBlackoutDates: () => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
  insertBlackoutDate: (payload: Record<string, unknown>) => Promise<{
    data: unknown[] | null;
    error: SupabaseRestError | null;
  }>;
};

type SupabaseRestClientOptions = {
  supabaseUrl: string;
  key: string;
  hasServiceKey: boolean;
};

const developmentHttpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === "production",
});

function formatSupabaseError(
  status: number,
  fallbackMessage: string,
  body: string,
): SupabaseRestError {
  try {
    const parsed = JSON.parse(body) as SupabaseRestError;

    return {
      ...parsed,
      status,
      message: parsed.message ?? fallbackMessage,
    };
  } catch {
    return {
      status,
      message: fallbackMessage,
      details: body,
    };
  }
}

function normalizeRequestError(error: unknown): SupabaseRestError {
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    const cause =
      errorRecord.cause && typeof errorRecord.cause === "object"
        ? (errorRecord.cause as Record<string, unknown>)
        : null;

    return {
      message:
        typeof errorRecord.message === "string"
          ? errorRecord.message
          : "Supabase request failed.",
      code:
        typeof errorRecord.code === "string"
          ? errorRecord.code
          : typeof cause?.code === "string"
            ? cause.code
            : undefined,
      details:
        typeof cause?.message === "string" ? cause.message : undefined,
      cause: error,
    };
  }

  return {
    message: String(error),
    cause: error,
  };
}

function createSupabaseUrl(supabaseUrl: string, table: string) {
  return new URL(`/rest/v1/${table}`, supabaseUrl);
}

function encodeInFilter(values: string[]) {
  return `in.(${values.join(",")})`;
}

async function requestJson<T>(
  supabaseUrl: string,
  key: string,
  table: string,
  params: Record<string, string>,
  init: {
    method?: "GET" | "PATCH" | "POST";
    body?: unknown;
    prefer?: string;
  } = {},
) {
  const url = createSupabaseUrl(supabaseUrl, table);

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  try {
    const { body, statusCode, statusMessage } = await requestText(url, {
      method: init.method ?? "GET",
      body: init.body ? JSON.stringify(init.body) : undefined,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
    });

    if (statusCode < 200 || statusCode >= 300) {
      return {
        data: null,
        error: formatSupabaseError(statusCode, statusMessage, body),
      };
    }

    return {
      data: body ? (JSON.parse(body) as T) : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeRequestError(error),
    };
  }
}

function requestText(
  url: URL,
  init: {
    method: "GET" | "PATCH" | "POST";
    body?: string;
    headers: Record<string, string>;
  },
) {
  return new Promise<{
    body: string;
    statusCode: number;
    statusMessage: string;
  }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: init.method,
        agent: developmentHttpsAgent,
        headers: {
          ...init.headers,
          ...(init.body ? { "Content-Length": Buffer.byteLength(init.body) } : {}),
        },
      },
      (response: IncomingMessage) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            statusCode: response.statusCode ?? 500,
            statusMessage: response.statusMessage ?? "Supabase request failed",
          });
        });
      },
    );

    request.on("error", reject);

    if (init.body) {
      request.write(init.body);
    }

    request.end();
  });
}

export function createSupabaseRestClient({
  supabaseUrl,
  key,
  hasServiceKey,
}: SupabaseRestClientOptions): AppointmentDatabaseClient {
  return {
    hasServiceKey,
    selectAppointments: async () =>
      requestJson<unknown[]>(supabaseUrl, key, "appointments", {
        select: "*",
        order: "created_at.desc",
      }),
    insertAppointment: async (payload) =>
      requestJson<unknown[]>(
        supabaseUrl,
        key,
        "appointments",
        {
          select: "*",
        },
        {
          method: "POST",
          body: payload,
          prefer: "return=representation",
        },
      ),
    selectSlotsByIds: async (slotIds) =>
      requestJson<unknown[]>(supabaseUrl, key, "available_slots2", {
        select: "*",
        id: encodeInFilter(slotIds),
      }),
    selectAvailableSlots: async () =>
      requestJson<unknown[]>(supabaseUrl, key, "available_slots2", {
        select: "*",
        is_booked: "eq.false",
        order: "date.asc,time.asc",
      }),
    selectSlotsByDate: async (date) =>
      requestJson<unknown[]>(supabaseUrl, key, "available_slots2", {
        select: "*",
        date: `eq.${date}`,
        order: "time.asc",
      }),
    insertSlots: async (slots) =>
      requestJson<unknown[]>(
        supabaseUrl,
        key,
        "available_slots2",
        {
          select: "*",
        },
        {
          method: "POST",
          body: slots,
          prefer: "return=representation",
        },
      ),
    updateSlotBooked: async (slotId, isBooked, onlyIfAvailable = false) =>
      requestJson<unknown[]>(
        supabaseUrl,
        key,
        "available_slots2",
        {
          select: "*",
          id: `eq.${slotId}`,
          ...(onlyIfAvailable ? { is_booked: "eq.false" } : {}),
        },
        {
          method: "PATCH",
          body: { is_booked: isBooked },
          prefer: "return=representation",
        },
      ),
    markDateUnavailable: async (date) =>
      requestJson<unknown[]>(
        supabaseUrl,
        key,
        "available_slots2",
        {
          select: "*",
          date: `eq.${date}`,
          is_booked: "eq.false",
        },
        {
          method: "PATCH",
          body: { is_booked: true },
          prefer: "return=representation",
        },
      ),
    selectBookedSlots: async () =>
      requestJson<unknown[]>(supabaseUrl, key, "available_slots2", {
        select: "*",
        is_booked: "eq.true",
        order: "date.desc,time.asc",
      }),
    updateAppointmentStatus: async (appointmentId, status) => {
      const result = await requestJson<null>(
        supabaseUrl,
        key,
        "appointments",
        {
          id: `eq.${appointmentId}`,
        },
        {
          method: "PATCH",
          body: { status },
          prefer: "return=minimal",
        },
      );

      return { error: result.error };
    },
    selectBlackoutDates: async () =>
      requestJson<unknown[]>(supabaseUrl, key, "blackout_dates", {
        select: "*",
        order: "date.desc",
      }),
    insertBlackoutDate: async (payload) =>
      requestJson<unknown[]>(
        supabaseUrl,
        key,
        "blackout_dates",
        {
          select: "*",
          on_conflict: "date",
        },
        {
          method: "POST",
          body: payload,
          prefer: "return=representation,resolution=merge-duplicates",
        },
      ),
  };
}
