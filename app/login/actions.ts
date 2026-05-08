"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  isSubmittedAdminPassword,
  normalizeAdminNextPath,
} from "@/app/lib/admin-auth";

function loginRedirect(error: "missing" | "invalid", nextPath: string) {
  redirect(`/login?error=${error}&next=${encodeURIComponent(nextPath)}`);
}

export async function logInAdmin(formData: FormData) {
  const nextPath = normalizeAdminNextPath(formData.get("next"));

  if (!isAdminPasswordConfigured()) {
    loginRedirect("missing", nextPath);
  }

  if (!isSubmittedAdminPassword(formData.get("password"))) {
    loginRedirect("invalid", nextPath);
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: ADMIN_SESSION_COOKIE,
    value: await createAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  redirect(nextPath);
}
