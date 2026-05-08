import type { AppointmentStatus } from "@/app/admin/calendar/_lib/calendar-types";
import {
  statusLabels,
  statusStyles,
} from "@/app/admin/calendar/_lib/calendar-utils";

type StatusBadgeProps = {
  status: AppointmentStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
