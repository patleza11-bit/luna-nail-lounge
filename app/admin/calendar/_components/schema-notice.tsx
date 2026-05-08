"use client";

import { useState } from "react";
import type { AppointmentCapabilities } from "@/app/admin/calendar/_lib/calendar-types";
import { getSchemaSql } from "@/app/admin/calendar/_lib/calendar-utils";

type SchemaNoticeProps = {
  capabilities: AppointmentCapabilities;
};

export function SchemaNotice({ capabilities }: SchemaNoticeProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (capabilities.hasStatus && capabilities.hasNotes) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#e4c1cf] bg-[#fff7f8] p-4 text-sm leading-6 text-[#6f4f45]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[#2f2824]">
            Appointment status and notes are not in the database yet.
          </p>
          <p className="mt-1">
            The calendar uses the existing appointment and slot tables now.
            Quick status actions will enable after this migration.
          </p>
        </div>
        <button
          className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-[#8f3f56] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? "Hide SQL" : "Show SQL"}
        </button>
      </div>
      {isOpen ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-[#2f2824] p-4 text-xs leading-5 text-[#fffaf6]">
          {getSchemaSql()}
        </pre>
      ) : null}
    </section>
  );
}
