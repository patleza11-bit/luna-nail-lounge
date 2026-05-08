export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

export type AppointmentSlot = {
  id: string;
  date: string;
  time: string;
  isBooked?: boolean;
};

export type CalendarAppointment = {
  id: string;
  customerName: string;
  service: string;
  phone: string;
  slotId: string;
  createdAt: string;
  slot: AppointmentSlot | null;
  status: AppointmentStatus;
  notes: string;
  startsAt: Date | null;
};

export type AppointmentCapabilities = {
  hasStatus: boolean;
  hasNotes: boolean;
};

export type CalendarView = "month" | "week" | "day";

export type AppointmentDataNotice = {
  type: "warning" | "error";
  message: string;
  detail?: string;
};

export type AppointmentQueryResult = {
  appointments: CalendarAppointment[];
  capabilities: AppointmentCapabilities;
  notices: AppointmentDataNotice[];
};
