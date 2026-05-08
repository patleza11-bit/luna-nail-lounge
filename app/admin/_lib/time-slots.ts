export function parseTimeToMinutes(time: string) {
  const trimmedTime = time.trim();
  const twelveHour = trimmedTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  const twentyFourHour = trimmedTime.match(/^(\d{1,2}):(\d{2})/);

  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? "0");
    const meridiem = twelveHour[3].toUpperCase();

    if (meridiem === "PM" && hours < 12) {
      hours += 12;
    }

    if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    return minutes >= 0 && minutes < 60 ? hours * 60 + minutes : Number.NaN;
  }

  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  return Number.NaN;
}

export function formatMinutesAsSlotTime(minutes: number) {
  const hours24 = Math.floor(minutes / 60);
  const displayHours = hours24 % 12 || 12;
  const displayMinutes = `${minutes % 60}`.padStart(2, "0");
  const meridiem = hours24 >= 12 ? "PM" : "AM";

  return `${displayHours}:${displayMinutes} ${meridiem}`;
}

export function formatTimeForSlot(time: string) {
  const minutes = parseTimeToMinutes(time);

  return Number.isFinite(minutes) ? formatMinutesAsSlotTime(minutes) : time;
}

export function buildSlotTimes(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    !Number.isFinite(intervalMinutes) ||
    intervalMinutes < 15 ||
    endMinutes <= startMinutes
  ) {
    return [];
  }

  const times: string[] = [];

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += intervalMinutes
  ) {
    times.push(formatMinutesAsSlotTime(minutes));
  }

  return times;
}

export function isValidDateInput(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function parseDateInput(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekdayIndex(date: string) {
  return parseDateInput(date).getDay();
}

export function eachDateInRange(startDate: string, endDate: string) {
  if (!isValidDateInput(startDate) || !isValidDateInput(endDate)) {
    return [];
  }

  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (end < start) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end && dates.length < 370) {
    dates.push(formatDateInput(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}
