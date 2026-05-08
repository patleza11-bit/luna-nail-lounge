"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AppointmentCapabilities,
  AppointmentDataNotice,
  AppointmentStatus,
  CalendarAppointment,
  CalendarView,
} from "@/app/admin/calendar/_lib/calendar-types";
import {
  addDays,
  addMonths,
  getDateKey,
  getTodayKey,
  monthFormatter,
  startOfWeek,
} from "@/app/admin/calendar/_lib/calendar-utils";
import { AppointmentDetailDrawer } from "@/app/admin/calendar/_components/appointment-detail-drawer";
import { CalendarToolbar } from "@/app/admin/calendar/_components/calendar-toolbar";
import { DesktopCalendarView } from "@/app/admin/calendar/_components/desktop-calendar-view";
import { MobileAgendaView } from "@/app/admin/calendar/_components/mobile-agenda-view";
import { SchemaNotice } from "@/app/admin/calendar/_components/schema-notice";

const initialCapabilities: AppointmentCapabilities = {
  hasStatus: false,
  hasNotes: false,
};

type SerializedCalendarAppointment = Omit<CalendarAppointment, "startsAt"> & {
  startsAt: string | null;
};

type CalendarAppointmentsResponse = {
  appointments: SerializedCalendarAppointment[];
  capabilities: AppointmentCapabilities;
  notices?: AppointmentDataNotice[];
  error?: string;
};

function getToolbarTitle(view: CalendarView, selectedDate: Date) {
  if (view === "month") {
    return monthFormatter.format(selectedDate);
  }

  if (view === "day") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(selectedDate);
  }

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);

  return `${monthFormatter.format(weekStart).replace(/\s\d{4}$/, "")} ${weekStart.getDate()} - ${weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

function reviveAppointment(
  appointment: SerializedCalendarAppointment,
): CalendarAppointment {
  return {
    ...appointment,
    startsAt: appointment.startsAt ? new Date(appointment.startsAt) : null,
  };
}

export function AppointmentCalendarClient() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [capabilities, setCapabilities] =
    useState<AppointmentCapabilities>(initialCapabilities);
  const [notices, setNotices] = useState<AppointmentDataNotice[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<CalendarAppointment | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadAppointments = useCallback(
    async (mode: "initial" | "refresh" = "refresh") => {
      try {
        if (mode === "initial") {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const response = await fetch("/admin/calendar/appointments", {
          cache: "no-store",
        });
        const result = (await response.json()) as CalendarAppointmentsResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Appointments could not be loaded.");
        }

        setAppointments(result.appointments.map(reviveAppointment));
        setCapabilities(result.capabilities);
        setNotices(result.notices ?? []);
        setError("");
      } catch (fetchError) {
        console.error("Supabase calendar fetch error:", fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "We could not load appointments. Please try again shortly.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadAppointments("initial");
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [loadAppointments]);

  const handlePrevious = () => {
    setSelectedDate((currentDate) => {
      if (view === "month") {
        return addMonths(currentDate, -1);
      }

      if (view === "day") {
        return addDays(currentDate, -1);
      }

      return addDays(currentDate, -7);
    });
  };

  const handleNext = () => {
    setSelectedDate((currentDate) => {
      if (view === "month") {
        return addMonths(currentDate, 1);
      }

      if (view === "day") {
        return addDays(currentDate, 1);
      }

      return addDays(currentDate, 7);
    });
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setView("day");
  };

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!selectedAppointment || !capabilities.hasStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setUpdateError("");

      const response = await fetch("/admin/calendar/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedAppointment.id,
          status,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Status could not be updated.");
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === selectedAppointment.id
            ? { ...appointment, status }
            : appointment,
        ),
      );
      setSelectedAppointment((appointment) =>
        appointment ? { ...appointment, status } : appointment,
      );
    } catch (statusError) {
      console.error("Supabase appointment status update error:", statusError);
      setUpdateError(
        statusError instanceof Error
          ? statusError.message
          : "Status could not be updated. Please try again.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.startsAt && getDateKey(appointment.startsAt) === getTodayKey(),
  );
  const stats = [
    { label: "Today", value: todayAppointments.length },
    { label: "Visible appointments", value: appointments.length },
    {
      label: "Needs scheduling",
      value: appointments.filter((item) => !item.slot).length,
    },
  ];

  return (
    <div className="space-y-5">
      <SchemaNotice capabilities={capabilities} />

      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div
              className={`rounded-lg border p-4 text-sm leading-6 ${
                notice.type === "error"
                  ? "border-[#e8beb6] bg-[#fff2ef] text-[#9f3f36]"
                  : "border-[#e4c1cf] bg-[#fff7f8] text-[#6f4f45]"
              }`}
              key={`${notice.message}-${notice.detail ?? ""}`}
            >
              <p className="font-semibold text-[#2f2824]">{notice.message}</p>
              {notice.detail ? <p className="mt-1">{notice.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            className="rounded-lg border border-[#eadbd1] bg-white p-4 shadow-sm shadow-[#eadbd1]/30"
            key={stat.label}
          >
            <p className="text-sm font-semibold text-[#9f635d]">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#2f2824]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="lg:hidden">
        <div className="mb-4 rounded-lg border border-[#eadbd1] bg-white p-4 shadow-sm shadow-[#eadbd1]/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#9f635d]">
                Mobile agenda
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[#2f2824]">
                Appointments
              </h2>
            </div>
            <button
              className="min-h-11 rounded-lg border border-[#d8bcb2] px-4 text-sm font-semibold text-[#6f4f45] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              disabled={isRefreshing}
              onClick={() => void loadAppointments()}
              type="button"
            >
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-[#eadbd1] bg-white p-5 text-sm text-[#6f625b]">
            Loading appointments...
          </div>
        ) : error ? (
          <div
            className="rounded-lg border border-[#e8beb6] bg-[#fff2ef] p-5 text-sm text-[#9f3f36]"
            role="alert"
          >
            {error}
          </div>
        ) : (
          <MobileAgendaView
            appointments={appointments}
            onSelectAppointment={setSelectedAppointment}
          />
        )}
      </section>

      <section className="hidden space-y-5 lg:block">
        <CalendarToolbar
          isRefreshing={isRefreshing}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onRefresh={() => void loadAppointments()}
          onToday={() => setSelectedDate(new Date())}
          onViewChange={setView}
          title={getToolbarTitle(view, selectedDate)}
          view={view}
        />

        {isLoading ? (
          <div className="rounded-lg border border-[#eadbd1] bg-white p-6 text-sm text-[#6f625b]">
            Loading appointments...
          </div>
        ) : error ? (
          <div
            className="rounded-lg border border-[#e8beb6] bg-[#fff2ef] p-6 text-sm text-[#9f3f36]"
            role="alert"
          >
            {error}
          </div>
        ) : (
          <DesktopCalendarView
            appointments={appointments}
            onSelectAppointment={setSelectedAppointment}
            onSelectDate={handleSelectDate}
            selectedDate={selectedDate}
            view={view}
          />
        )}
      </section>

      <AppointmentDetailDrawer
        appointment={selectedAppointment}
        canUpdateStatus={capabilities.hasStatus}
        isUpdating={isUpdatingStatus}
        onClose={() => {
          setSelectedAppointment(null);
          setUpdateError("");
        }}
        onStatusChange={handleStatusChange}
        updateError={updateError}
      />
    </div>
  );
}
