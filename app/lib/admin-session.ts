import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/app/lib/admin-auth";

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return isAdminSessionTokenValid(token);
}

export async function requireAdminSession() {
  const hasSession = await hasAdminSession();

  if (!hasSession) {
    redirect("/login");
  }
}
