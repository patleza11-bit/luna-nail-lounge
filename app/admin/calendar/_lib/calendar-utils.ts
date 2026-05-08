import type {
  AppointmentStatus,
  CalendarAppointment,
} from "@/app/admin/calendar/_lib/calendar-types";

export const appointmentStatuses: AppointmentStatus[] = [
  "booked",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

export const statusLabels: Record<AppointmentStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

export const statusStyles: Record<AppointmentStatus, string> = {
  booked: "border-[#f1c9d3] bg-[#fff1f4] text-[#8f3f56]",
  confirmed: "border-[#c9dec8] bg-[#edf7ed] text-[#386344]",
  completed: "border-[#ded1c1] bg-[#f8f0e8] text-[#6d5138]",
  cancelled: "border-[#d8ceca] bg-[#f3eeee] text-[#695c57]",
  "no-show": "border-[#e4c1cf] bg-[#f8e9ef] text-[#793f59]",
};

export const dateHeadingFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

export const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayKey() {
  return getDateKey(new Date());
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfWeek(date: Date) {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());

  return start;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

export function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date);

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthDays(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const lastVisibleDay = addDays(startOfWeek(monthEnd), 6);
  const days: Date[] = [];

  for (
    let cursor = gridStart;
    cursor <= lastVisibleDay;
    cursor = addDays(cursor, 1)
  ) {
    days.push(cursor);
  }

  return days;
}

export function parseAppointmentDateTime(date: string, time: string) {
  const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!dateParts) {
    return null;
  }

  const [, year, month, day] = dateParts;
  const twelveHourTime = time
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const twentyFourHourTime = time.trim().match(/^(\d{1,2}):(\d{2})/);

  let hours = 0;
  let minutes = 0;

  if (twelveHourTime) {
    hours = Number(twelveHourTime[1]);
    minutes = Number(twelveHourTime[2] ?? "0");

    if (twelveHourTime[3].toUpperCase() === "PM" && hours < 12) {
      hours += 12;
    }

    if (twelveHourTime[3].toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }
  } else if (twentyFourHourTime) {
    hours = Number(twentyFourHourTime[1]);
    minutes = Number(twentyFourHourTime[2]);
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hours,
    minutes,
  );
}

export function formatAppointmentTime(appointment: CalendarAppointment) {
  if (appointment.startsAt) {
    return timeFormatter.format(appointment.startsAt);
  }

  return appointment.slot?.time ?? "Time pending";
}

export function getAppointmentDateKey(appointment: CalendarAppointment) {
  if (appointment.startsAt) {
    return getDateKey(appointment.startsAt);
  }

  return appointment.slot?.date ?? "unscheduled";
}

export function sortAppointments(appointments: CalendarAppointment[]) {
  return [...appointments].sort((first, second) => {
    const firstTime = first.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const secondTime = second.startsAt?.getTime() ?? Number.MAX_SAFE_INTEGER;

    return firstTime - secondTime || first.customerName.localeCompare(second.customerName);
  });
}

export function groupAppointmentsByDay(appointments: CalendarAppointment[]) {
  return sortAppointments(appointments).reduce<
    Record<string, CalendarAppointment[]>
  >((groups, appointment) => {
    const key = getAppointmentDateKey(appointment);
    groups[key] = [...(groups[key] ?? []), appointment];

    return groups;
  }, {});
}

export function normalizeAppointmentStatus(
  status: string | null | undefined,
): AppointmentStatus {
  if (appointmentStatuses.includes(status as AppointmentStatus)) {
    return status as AppointmentStatus;
  }

  return "booked";
}

export function getSchemaSql() {
  return `alter table appointments
add column status text not null default 'booked'
check (status in ('booked', 'confirmed', 'completed', 'cancelled', 'no-show'));

alter table appointments
add column notes text;`;
}
