export type SupabaseErrorDetails = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message: string;
  name?: string;
  status?: number;
};

export function formatSupabaseError(error: unknown): SupabaseErrorDetails {
  if (!error || typeof error !== "object") {
    return {
      message: error ? String(error) : "Unknown Supabase error.",
    };
  }

  const record = error as Record<string, unknown>;
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as Record<string, unknown>)
      : null;

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    details:
      typeof record.details === "string"
        ? record.details
        : record.details === null
          ? null
          : typeof cause?.message === "string"
            ? cause.message
            : undefined,
    hint:
      typeof record.hint === "string"
        ? record.hint
        : record.hint === null
          ? null
          : undefined,
    message:
      typeof record.message === "string" && record.message
        ? record.message
        : "Supabase request failed.",
    name: typeof record.name === "string" ? record.name : undefined,
    status:
      typeof record.status === "number"
        ? record.status
        : typeof record.statusCode === "number"
          ? record.statusCode
          : undefined,
  };
}

export function describeSupabaseError(error: unknown) {
  const details = formatSupabaseError(error);
  const parts = [details.message];

  if (details.code) {
    parts.push(`Code: ${details.code}.`);
  }

  if (details.details) {
    parts.push(`Details: ${details.details}.`);
  }

  if (details.hint) {
    parts.push(`Hint: ${details.hint}.`);
  }

  return parts.join(" ");
}
