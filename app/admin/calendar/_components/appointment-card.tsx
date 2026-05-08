import type { CalendarAppointment } from "@/app/admin/calendar/_lib/calendar-types";
import {
  formatAppointmentTime,
  shortDateFormatter,
} from "@/app/admin/calendar/_lib/calendar-utils";
import { StatusBadge } from "@/app/admin/calendar/_components/status-badge";

type AppointmentCardProps = {
  appointment: CalendarAppointment;
  compact?: boolean;
  onSelect: (appointment: CalendarAppointment) => void;
};

export function AppointmentCard({
  appointment,
  compact = false,
  onSelect,
}: AppointmentCardProps) {
  const dateLabel = appointment.startsAt
    ? shortDateFormatter.format(appointment.startsAt)
    : "Date pending";

  return (
    <button
      className={`w-full rounded-lg border border-[#eadbd1] bg-white text-left shadow-sm shadow-[#eadbd1]/30 transition hover:border-[#d6a9a1] hover:shadow-md hover:shadow-[#d8bcb2]/30 focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
        compact ? "p-3" : "p-4"
      }`}
      onClick={() => onSelect(appointment)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#2f2824]">
            {appointment.customerName}
          </p>
          <p className="mt-1 truncate text-sm text-[#6f625b]">
            {appointment.service}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f544f]">
        <span>{dateLabel}</span>
        <span>{formatAppointmentTime(appointment)}</span>
        {appointment.phone ? <span>{appointment.phone}</span> : null}
      </div>
    </button>
  );
}
