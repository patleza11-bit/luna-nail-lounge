import Link from "next/link";
import { redirect } from "next/navigation";
import { logInAdmin } from "@/app/login/actions";
import {
  ADMIN_PASSWORD_ENV_LABEL,
  isAdminPasswordConfigured,
  normalizeAdminNextPath,
} from "@/app/lib/admin-auth";
import { hasAdminSession } from "@/app/lib/admin-session";

const errorMessages = {
  invalid: "That passcode did not match.",
  missing: `Admin login is not configured yet. Set ${ADMIN_PASSWORD_ENV_LABEL} in .env.local.`,
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: keyof typeof errorMessages;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeAdminNextPath(params.next);
  const isConfigured = isAdminPasswordConfigured();

  if (await hasAdminSession()) {
    redirect(nextPath);
  }

  const errorMessage = params.error ? errorMessages[params.error] : "";

  return (
    <main className="min-h-screen bg-[#fffaf6] px-5 py-8 text-[#2f2824] sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-[#eadbd1] bg-white shadow-xl shadow-[#eadbd1]/35 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#2f2824] p-8 text-white sm:p-10">
            <Link
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[#f7d8d0] transition hover:text-white"
              href="/"
            >
              Beauty Nail Lounge
            </Link>
            <div className="mt-14 max-w-sm">
              <p className="text-sm text-[#f7d8d0]">Owner access</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white">
                A calm little doorway for the salon day.
              </h1>
              <p className="mt-5 text-base leading-8 text-[#f7e7e1]">
                The admin area is ready for the first pass. Supabase project
                keys exist, but Supabase Auth has not been wired into this app
                yet.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mx-auto max-w-md">
              <p className="text-sm font-semibold text-[#9f635d]">
                Temporary admin login
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2f2824]">
                Enter admin passcode
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6f625b]">
                Set <code>ADMIN_PASSWORD</code> in <code>.env.local</code> to
                enable this placeholder gate. <code>LUNA_ADMIN_PASSWORD</code>{" "}
                is still accepted as a legacy fallback.
              </p>

              {!isConfigured ? (
                <p
                  className="mt-6 rounded-lg border border-[#e8beb6] bg-[#fff2ef] px-4 py-3 text-sm text-[#9f3f36]"
                  role="alert"
                >
                  {errorMessages.missing}
                </p>
              ) : errorMessage ? (
                <p
                  className="mt-6 rounded-lg border border-[#e8beb6] bg-[#fff2ef] px-4 py-3 text-sm text-[#9f3f36]"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}

              <form action={logInAdmin} className="mt-7 space-y-5">
                <input name="next" type="hidden" value={nextPath} />
                <label className="block">
                  <span className="text-sm font-medium text-[#5f544f]">
                    Admin passcode
                  </span>
                  <input
                    className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#f3ece7]"
                    disabled={!isConfigured}
                    name="password"
                    placeholder="Passcode"
                    required
                    type="password"
                  />
                </label>
                <button
                  className="min-h-12 w-full rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#cdbfba] disabled:text-[#786c66] disabled:shadow-none"
                  disabled={!isConfigured}
                  type="submit"
                >
                  Enter admin
                </button>
              </form>

              <div className="mt-8 rounded-lg border border-[#eadbd1] bg-[#fffaf6] p-4 text-sm leading-6 text-[#6f625b]">
                Replace this passcode with Supabase Auth once owner accounts,
                redirects, and server-side session cookies are configured.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
