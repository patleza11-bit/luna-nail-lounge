import { createSupabaseRestClient } from "@/app/admin/calendar/_lib/supabase-rest-client";

export function getSupabaseAdminDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  const fallbackAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const key = serviceKey ?? fallbackAnonKey;

  if (!supabaseUrl || !key) {
    return {
      client: null,
      hasServiceKey: Boolean(serviceKey),
    };
  }

  return {
    client: createSupabaseRestClient({
      supabaseUrl,
      key,
      hasServiceKey: Boolean(serviceKey),
    }),
    hasServiceKey: Boolean(serviceKey),
  };
}
