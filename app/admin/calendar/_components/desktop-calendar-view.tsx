"use client";

import type {
  CalendarAppointment,
  CalendarView,
} from "@/app/admin/calendar/_lib/calendar-types";
import {
  dateHeadingFormatter,
  formatAppointmentTime,
  getAppointmentDateKey,
  getDateKey,
  getMonthDays,
  getWeekDays,
  groupAppointmentsByDay,
  shortDateFormatter,
  weekdayFormatter,
} from "@/app/admin/calendar/_lib/calendar-utils";
import { AppointmentCard } from "@/app/admin/calendar/_components/appointment-card";
import { StatusBadge } from "@/app/admin/calendar/_components/status-badge";

type DesktopCalendarViewProps = {
  appointments: CalendarAppointment[];
  selectedDate: Date;
  view: CalendarView;
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (appointment: CalendarAppointment) => void;
};

function EmptyDay({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={`rounded-lg border border-dashed border-[#eadbd1] bg-[#fffaf6] text-sm text-[#8d7f78] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      No appointments
    </p>
  );
}

function MonthView({
  appointments,
  selectedDate,
  onSelectDate,
  onSelectAppointment,
}: DesktopCalendarViewProps) {
  const groupedAppointments = groupAppointmentsByDay(appointments);
  const selectedMonth = selectedDate.getMonth();
  const todayKey = getDateKey(new Date());

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-[#eadbd1] bg-white">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div
          className="border-b border-[#eadbd1] bg-[#fffaf6] px-3 py-3 text-sm font-semibold text-[#6f625b]"
          key={day}
        >
          {day}
        </div>
      ))}
      {getMonthDays(selectedDate).map((day) => {
        const dayKey = getDateKey(day);
        const dayAppointments = groupedAppointments[dayKey] ?? [];
        const isOutsideMonth = day.getMonth() !== selectedMonth;
        const isToday = dayKey === todayKey;

        return (
          <div
            className={`min-h-40 border-b border-r border-[#eadbd1] p-2 ${
              isOutsideMonth ? "bg-[#fbf7f4] text-[#9d8d85]" : "bg-white"
            }`}
            key={dayKey}
          >
            <button
              className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
                isToday
                  ? "bg-[#2f2824] text-white"
                  : "text-[#5f544f] hover:bg-[#fffaf6]"
              }`}
              onClick={() => onSelectDate(day)}
              type="button"
            >
              {day.getDate()}
            </button>
            <div className="space-y-2">
              {dayAppointments.slice(0, 3).map((appointment) => (
                <button
                  className="w-full rounded-md bg-[#fff1f4] px-2 py-2 text-left text-xs text-[#5f2838] transition hover:bg-[#f7d8d0] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
                  key={appointment.id}
                  onClick={() => onSelectAppointment(appointment)}
                  type="button"
                >
                  <span className="block font-semibold">
                    {formatAppointmentTime(appointment)}
                  </span>
                  <span className="block truncate">
                    {appointment.customerName}
                  </span>
                </button>
              ))}
              {dayAppointments.length > 3 ? (
                <span className="block text-xs font-semibold text-[#9f635d]">
                  +{dayAppointments.length - 3} more
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  appointments,
  selectedDate,
  onSelectDate,
  onSelectAppointment,
}: DesktopCalendarViewProps) {
  const groupedAppointments = groupAppointmentsByDay(appointments);
  const todayKey = getDateKey(new Date());

  return (
    <div className="grid grid-cols-7 gap-3">
      {getWeekDays(selectedDate).map((day) => {
        const dayKey = getDateKey(day);
        const dayAppointments = groupedAppointments[dayKey] ?? [];
        const isToday = dayKey === todayKey;

        return (
          <section
            className="min-h-[28rem] rounded-lg border border-[#eadbd1] bg-white p-3 shadow-sm shadow-[#eadbd1]/30"
            key={dayKey}
          >
            <button
              className="mb-4 w-full rounded-lg bg-[#fffaf6] p-3 text-left transition hover:bg-[#f8efe9] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              onClick={() => onSelectDate(day)}
              type="button"
            >
              <span className="block text-sm font-semibold text-[#9f635d]">
                {weekdayFormatter.format(day)}
              </span>
              <span
                className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold ${
                  isToday ? "bg-[#2f2824] text-white" : "text-[#2f2824]"
                }`}
              >
                {day.getDate()}
              </span>
            </button>

            <div className="space-y-3">
              {dayAppointments.length > 0 ? (
                dayAppointments.map((appointment) => (
                  <AppointmentCard
                    appointment={appointment}
                    compact
                    key={appointment.id}
                    onSelect={onSelectAppointment}
                  />
                ))
              ) : (
                <EmptyDay compact />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DayView({
  appointments,
  selectedDate,
  onSelectAppointment,
}: DesktopCalendarViewProps) {
  const selectedDateKey = getDateKey(selectedDate);
  const selectedAppointments = appointments.filter(
    (appointment) => getAppointmentDateKey(appointment) === selectedDateKey,
  );

  return (
    <section className="rounded-lg border border-[#eadbd1] bg-white p-5 shadow-sm shadow-[#eadbd1]/30">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#9f635d]">Selected day</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2f2824]">
            {dateHeadingFormatter.format(selectedDate)}
          </h2>
        </div>
        <span className="rounded-full bg-[#fffaf6] px-4 py-2 text-sm font-semibold text-[#6f625b]">
          {selectedAppointments.length} appointments
        </span>
      </div>

      <div className="space-y-3">
        {selectedAppointments.length > 0 ? (
          selectedAppointments.map((appointment) => (
            <button
              className="grid w-full gap-4 rounded-lg border border-[#eadbd1] bg-[#fffdfb] p-4 text-left transition hover:border-[#d6a9a1] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] md:grid-cols-[9rem_1fr_auto]"
              key={appointment.id}
              onClick={() => onSelectAppointment(appointment)}
              type="button"
            >
              <div>
                <p className="text-xl font-semibold text-[#2f2824]">
                  {formatAppointmentTime(appointment)}
                </p>
                <p className="mt-1 text-sm text-[#6f625b]">
                  {shortDateFormatter.format(selectedDate)}
                </p>
              </div>
              <div>
                <p className="text-lg font-semibold text-[#2f2824]">
                  {appointment.customerName}
                </p>
                <p className="mt-1 text-sm text-[#6f625b]">
                  {appointment.service}
                </p>
                {appointment.phone ? (
                  <p className="mt-2 text-sm text-[#5f544f]">
                    {appointment.phone}
                  </p>
                ) : null}
              </div>
              <StatusBadge status={appointment.status} />
            </button>
          ))
        ) : (
          <EmptyDay />
        )}
      </div>
    </section>
  );
}

export function DesktopCalendarView(props: DesktopCalendarViewProps) {
  if (props.view === "month") {
    return <MonthView {...props} />;
  }

  if (props.view === "day") {
    return <DayView {...props} />;
  }

  return <WeekView {...props} />;
}
