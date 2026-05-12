export const ADMIN_SESSION_COOKIE = "beauty_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const ADMIN_PASSWORD_ENV_LABEL =
  "ADMIN_PASSWORD (or legacy LUNA_ADMIN_PASSWORD)";

const encoder = new TextEncoder();

function getAdminSecret() {
  return (
    process.env.ADMIN_PASSWORD?.trim() ||
    process.env.LUNA_ADMIN_PASSWORD?.trim() ||
    ""
  );
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(first: string, second: string) {
  if (first.length !== second.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signSessionPayload(payload: string) {
  const secret = getAdminSecret();

  if (!secret) {
    throw new Error(`${ADMIN_PASSWORD_ENV_LABEL} is required for admin sessions.`);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return toHex(new Uint8Array(signature));
}

export function isAdminPasswordConfigured() {
  return getAdminSecret().length > 0;
}

export function isSubmittedAdminPassword(password: FormDataEntryValue | null) {
  const secret = getAdminSecret();

  return typeof password === "string" && secret.length > 0 && password === secret;
}

export function normalizeAdminNextPath(
  value: FormDataEntryValue | string | null | undefined,
) {
  const nextPath = typeof value === "string" ? value : "";

  if (!nextPath.startsWith("/admin") || nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

export async function createAdminSessionToken() {
  const issuedAt = Date.now().toString();
  const signature = await signSessionPayload(issuedAt);

  return `${issuedAt}.${signature}`;
}

export async function isAdminSessionTokenValid(token: string | undefined) {
  if (!token || !isAdminPasswordConfigured()) {
    return false;
  }

  const [issuedAtValue, signature, extra] = token.split(".");
  const issuedAt = Number(issuedAtValue);

  if (extra || !issuedAtValue || !signature || !Number.isFinite(issuedAt)) {
    return false;
  }

  const now = Date.now();
  const maxAgeMs = ADMIN_SESSION_MAX_AGE_SECONDS * 1000;

  if (issuedAt > now + 60_000 || now - issuedAt > maxAgeMs) {
    return false;
  }

  const expectedSignature = await signSessionPayload(issuedAtValue);

  return constantTimeEqual(signature, expectedSignature);
}
