"use client";

import type {
  AppointmentStatus,
  CalendarAppointment,
} from "@/app/admin/calendar/_lib/calendar-types";
import {
  appointmentStatuses,
  dateHeadingFormatter,
  formatAppointmentTime,
  getSchemaSql,
  statusLabels,
} from "@/app/admin/calendar/_lib/calendar-utils";
import { StatusBadge } from "@/app/admin/calendar/_components/status-badge";

type AppointmentDetailDrawerProps = {
  appointment: CalendarAppointment | null;
  canUpdateStatus: boolean;
  isUpdating: boolean;
  updateError: string;
  onClose: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
};

export function AppointmentDetailDrawer({
  appointment,
  canUpdateStatus,
  isUpdating,
  updateError,
  onClose,
  onStatusChange,
}: AppointmentDetailDrawerProps) {
  if (!appointment) {
    return null;
  }

  const dateLabel = appointment.startsAt
    ? dateHeadingFormatter.format(appointment.startsAt)
    : appointment.slot?.date ?? "Date pending";

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close appointment details"
        className="absolute inset-0 bg-[#2f2824]/35"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-[#fffaf6] p-5 shadow-2xl shadow-[#2f2824]/30 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:p-7"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#9f635d]">
              Appointment details
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-[#2f2824]">
              {appointment.customerName}
            </h2>
          </div>
          <button
            className="min-h-11 rounded-lg border border-[#eadbd1] bg-white px-4 text-sm font-semibold text-[#5f544f] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <StatusBadge status={appointment.status} />
        </div>

        <dl className="mt-6 grid gap-3">
          {[
            ["Service", appointment.service],
            ["Date", dateLabel],
            ["Time", formatAppointmentTime(appointment)],
            ["Phone", appointment.phone || "Not provided"],
            ["Status", statusLabels[appointment.status]],
          ].map(([label, value]) => (
            <div
              className="rounded-lg border border-[#eadbd1] bg-white p-4"
              key={label}
            >
              <dt className="text-xs font-semibold text-[#9f635d]">{label}</dt>
              <dd className="mt-1 text-base font-semibold text-[#2f2824]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-6 rounded-lg border border-[#eadbd1] bg-white p-4">
          <h3 className="text-base font-semibold text-[#2f2824]">Notes</h3>
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">
            {appointment.notes || "No notes on this appointment yet."}
          </p>
        </section>

        <section className="mt-6">
          <h3 className="text-base font-semibold text-[#2f2824]">
            Quick actions
          </h3>
          <div className="mt-3 grid gap-2">
            {appointmentStatuses
              .filter((status) => status !== "booked")
              .map((status) => (
                <button
                  className="min-h-12 rounded-lg border border-[#d8bcb2] bg-white px-4 text-left text-sm font-semibold text-[#5f544f] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#f3ece7] disabled:text-[#9d8d85]"
                  disabled={!canUpdateStatus || isUpdating}
                  key={status}
                  onClick={() => onStatusChange(status)}
                  type="button"
                >
                  Mark {statusLabels[status].toLowerCase()}
                </button>
              ))}
          </div>

          {updateError ? (
            <p
              className="mt-3 rounded-lg border border-[#e8beb6] bg-[#fff2ef] px-4 py-3 text-sm text-[#9f3f36]"
              role="alert"
            >
              {updateError}
            </p>
          ) : null}

          {!canUpdateStatus ? (
            <div className="mt-4 rounded-lg border border-[#eadbd1] bg-white p-4 text-sm leading-6 text-[#6f625b]">
              <p className="font-semibold text-[#2f2824]">
                Status actions need one database change first.
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[#2f2824] p-3 text-xs leading-5 text-[#fffaf6]">
                {getSchemaSql()}
              </pre>
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
