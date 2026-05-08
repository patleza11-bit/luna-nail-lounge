"use client";

import type { CalendarAppointment } from "@/app/admin/calendar/_lib/calendar-types";
import {
  dateHeadingFormatter,
  getAppointmentDateKey,
  groupAppointmentsByDay,
} from "@/app/admin/calendar/_lib/calendar-utils";
import { AppointmentCard } from "@/app/admin/calendar/_components/appointment-card";

type MobileAgendaViewProps = {
  appointments: CalendarAppointment[];
  onSelectAppointment: (appointment: CalendarAppointment) => void;
};

function formatGroupHeading(dayKey: string, appointments: CalendarAppointment[]) {
  const firstAppointment = appointments[0];

  if (firstAppointment?.startsAt) {
    return dateHeadingFormatter.format(firstAppointment.startsAt);
  }

  return dayKey === "unscheduled" ? "Unscheduled" : dayKey;
}

export function MobileAgendaView({
  appointments,
  onSelectAppointment,
}: MobileAgendaViewProps) {
  const groupedAppointments = groupAppointmentsByDay(appointments);
  const dayKeys = Object.keys(groupedAppointments).sort();

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] p-5 text-sm leading-6 text-[#6f625b]">
        No appointments are visible yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {dayKeys.map((dayKey) => {
        const dayAppointments = groupedAppointments[dayKey] ?? [];
        const scheduledCount = dayAppointments.filter(
          (appointment) => getAppointmentDateKey(appointment) !== "unscheduled",
        ).length;

        return (
          <section className="rounded-lg bg-[#fffaf6] p-3" key={dayKey}>
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h2 className="text-base font-semibold text-[#2f2824]">
                {formatGroupHeading(dayKey, dayAppointments)}
              </h2>
              <span className="text-sm text-[#6f625b]">
                {scheduledCount || dayAppointments.length}
              </span>
            </div>
            <div className="space-y-3">
              {dayAppointments.map((appointment) => (
                <AppointmentCard
                  appointment={appointment}
                  key={appointment.id}
                  onSelect={onSelectAppointment}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
