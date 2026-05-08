"use client";

import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";

type AvailabilitySlotRow = {
  id: number | string;
  date: string;
  time: string;
  is_booked: boolean;
};

type AvailabilitySlot = {
  id: string;
  date: string;
  time: string;
  is_booked: boolean;
};

type BookingMessage = {
  type: "success" | "error";
  text: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function parseSlotDate(date: string) {
  return new Date(date.includes("T") ? date : `${date}T00:00:00`);
}

function formatSlotTime(time: string) {
  const timeParts = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!timeParts) {
    return time;
  }

  const [, hours, minutes] = timeParts;
  const date = new Date(2026, 0, 1, Number(hours), Number(minutes));

  return timeFormatter.format(date);
}

export default function Home() {
  const [availabilitySlots, setAvailabilitySlots] = useState<
    AvailabilitySlot[]
  >([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Gel Manicure");
  const [bookingMessage, setBookingMessage] = useState<BookingMessage | null>(
    null,
  );
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const fetchAvailability = useCallback(async () => {
    await Promise.resolve();

    if (!supabase) {
      setAvailabilityError(
        "Supabase is not configured. Add your public Supabase URL and key to load availability.",
      );
      setAvailabilitySlots([]);
      setIsLoadingAvailability(false);
      return;
    }

    try {
      setIsLoadingAvailability(true);

      const { data, error } = await supabase
        .from("available_slots2")
        .select("id,date,time,is_booked")
        .eq("is_booked", false)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        console.error("Supabase available_slots2 error:", error);
        setAvailabilityError(
          "We could not load appointment availability. Please try again shortly.",
        );
        setAvailabilitySlots([]);
        return;
      }

      const slots = ((data ?? []) as AvailabilitySlotRow[])
        .filter((slot) => slot.date && slot.time)
        .map((slot) => ({
          id: String(slot.id),
          date: slot.date,
          time: slot.time,
          is_booked: slot.is_booked,
        }));

      setAvailabilitySlots(slots);
      setAvailabilityError("");
    } catch (error) {
      console.error("Unexpected availability error:", error);
      setAvailabilityError(
        "We could not load appointment availability. Please try again shortly.",
      );
      setAvailabilitySlots([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    const availabilityTimer = window.setTimeout(() => {
      fetchAvailability();
    }, 0);

    return () => {
      window.clearTimeout(availabilityTimer);
    };
  }, [fetchAvailability]);

  const availabilityByDate = availabilitySlots.reduce<
    Record<string, AvailabilitySlot[]>
  >((groups, slot) => {
    groups[slot.date] = [...(groups[slot.date] ?? []), slot];
    return groups;
  }, {});

  const availableDates = Object.entries(availabilityByDate)
    .map(([date, slots]) => {
      const parsedDate = parseSlotDate(date);

      return {
        id: date,
        weekday: weekdayFormatter.format(parsedDate),
        label: dateFormatter.format(parsedDate),
        slots,
      };
    })
    .sort((firstDate, secondDate) =>
      firstDate.id.localeCompare(secondDate.id),
    );

  const selectedDateOption = availableDates.find(
    (date) => date.id === selectedDate,
  );
  const availableTimeSlots = selectedDateOption?.slots ?? [];
  const selectedSlot = availableTimeSlots.find(
    (slot) => slot.id === selectedSlotId,
  );

  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingMessage(null);

    const trimmedCustomerName = customerName.trim();
    const trimmedPhone = phone.trim();

    if (
      !trimmedCustomerName ||
      !trimmedPhone ||
      !service ||
      !selectedDate ||
      !selectedTime ||
      !selectedDateOption ||
      !selectedSlot
    ) {
      setBookingMessage({
        type: "error",
        text: "Please complete your name, phone, service, date, and time before booking.",
      });
      return;
    }

    if (!supabase) {
      setBookingMessage({
        type: "error",
        text: "Booking is unavailable until Supabase is configured.",
      });
      return;
    }

    try {
      setIsSubmittingBooking(true);

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          customer_name: trimmedCustomerName,
          phone: trimmedPhone,
          service,
          slot_id: selectedSlot.id,
        });

      if (appointmentError) {
        console.error("Supabase appointments insert error:", appointmentError);
        setBookingMessage({
          type: "error",
          text: "We could not save your appointment request. Please check your details and try again.",
        });
        return;
      }

      const { error: slotUpdateError } = await supabase
        .from("available_slots2")
        .update({ is_booked: true })
        .eq("id", selectedSlot.id);

      if (slotUpdateError) {
        console.error(
          "Supabase available_slots2 update error:",
          slotUpdateError,
        );
        setBookingMessage({
          type: "error",
          text: "Your request was saved, but we could not remove that time from availability. Please contact the salon to confirm.",
        });
        await fetchAvailability();
        return;
      }

      setBookingMessage({
        type: "success",
        text: `Appointment request saved for ${selectedDateOption.label} at ${formatSlotTime(
          selectedSlot.time,
        )}.`,
      });
      setCustomerName("");
      setPhone("");
      setService("Gel Manicure");
      setSelectedDate("");
      setSelectedTime("");
      setSelectedSlotId("");
      await fetchAvailability();
    } catch (error) {
      console.error("Unexpected booking submission error:", error);
      setBookingMessage({
        type: "error",
        text: "Something went wrong while saving your request. Please try again.",
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const services = [
    {
      name: "Gel Manicure",
      description: "Glossy, chip-resistant color finished with meticulous cuticle care.",
      price: "From $45",
    },
    {
      name: "Acrylic Full Set",
      description: "Sculpted length and shape customized for a refined, polished look.",
      price: "From $70",
    },
    {
      name: "Deluxe Pedicure",
      description: "A restorative foot ritual with exfoliation, massage, and luxe polish.",
      price: "From $58",
    },
    {
      name: "Nail Art Design",
      description: "Minimal accents, chrome finishes, and bespoke detail work.",
      price: "From $18",
    },
  ];

  return (
    <main className="min-h-screen scroll-smooth bg-[#fffaf7] text-stone-900">
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <nav className="sticky top-0 z-50 -mb-20 h-20 border-b border-white/15 bg-stone-950/10 px-5 backdrop-blur-md sm:px-10">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4">
          <a
            className="shrink-0 text-sm font-semibold uppercase tracking-[0.26em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition hover:text-rose-100 sm:text-base"
            href="#home"
          >
            Luna Nail Lounge
          </a>
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 text-xs font-medium uppercase tracking-[0.18em] text-rose-50 shadow-lg shadow-stone-950/10 sm:gap-2">
            <a
              className="rounded-full px-3 py-2 transition hover:bg-white/15 hover:text-white sm:px-4"
              href="#home"
            >
              Home
            </a>
            <a
              className="rounded-full px-3 py-2 transition hover:bg-white/15 hover:text-white sm:px-4"
              href="#services"
            >
              Services
            </a>
            <a
              className="rounded-full px-3 py-2 transition hover:bg-white/15 hover:text-white sm:px-4"
              href="#book"
            >
              Book
            </a>
          </div>
        </div>
      </nav>

      <header
        id="home"
        className="relative flex min-h-[85vh] scroll-mt-20 items-center justify-center overflow-hidden px-6 text-center sm:min-h-[92vh] sm:px-10"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="scale-[1.02] object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/hero-nails.png"
        />
        <div className="absolute inset-0 bg-rose-950/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/50 via-stone-950/18 to-rose-950/42" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/18 via-transparent to-stone-950/18" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#fffaf7] via-[#fffaf7]/25 to-transparent" />
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="absolute left-1/2 top-1/2 -z-10 h-56 w-[min(34rem,88vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-950/45 blur-3xl" />
          <p className="mb-6 text-[0.72rem] font-semibold uppercase tracking-[0.42em] text-rose-100/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            Modern nail atelier
          </p>
          <h1 className="text-5xl font-bold tracking-[0.04em] text-white drop-shadow-[0_10px_34px_rgba(0,0,0,0.65)] sm:text-7xl lg:text-8xl">
            Luna Nail Lounge
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base font-light leading-8 text-rose-50/95 drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)] sm:text-lg">
            Luxury nail care and modern beauty services designed for elevated
            everyday rituals.
          </p>
        </div>
      </header>

      <section
        id="services"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16 sm:px-10 lg:py-24"
      >
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-rose-400">
            Services
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-stone-950 sm:text-4xl">
            Our Services
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article
              key={service.name}
              className="rounded-2xl border border-rose-100 bg-white/85 p-6 shadow-sm shadow-rose-100/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-100"
            >
              <div className="mb-5 h-px w-12 bg-rose-300" />
              <h3 className="text-xl font-semibold text-stone-950">
                {service.name}
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {service.description}
              </p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">
                {service.price}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="book" className="scroll-mt-24 px-6 pb-20 sm:px-10 lg:pb-28">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl shadow-rose-100/80 sm:p-10">
          <div className="mb-8 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-rose-400">
              Reserve your visit
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-stone-950">
              Book Appointment
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
              Share your preferred service and timing. Our concierge will
              confirm availability.
            </p>
          </div>

          <form
            className="grid gap-5 sm:grid-cols-2"
            noValidate
            onSubmit={handleBookingSubmit}
          >
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-[#fffaf7] px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setBookingMessage(null);
                }}
                placeholder="Your name"
                required
                type="text"
                value={customerName}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">Phone</span>
              <input
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-[#fffaf7] px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                onChange={(event) => {
                  setPhone(event.target.value);
                  setBookingMessage(null);
                }}
                placeholder="(555) 123-4567"
                required
                type="tel"
                value={phone}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                Service
              </span>
              <select
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-[#fffaf7] px-4 py-3 text-stone-900 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                onChange={(event) => {
                  setService(event.target.value);
                  setBookingMessage(null);
                }}
                required
                value={service}
              >
                <option>Gel Manicure</option>
                <option>Acrylic Full Set</option>
                <option>Deluxe Pedicure</option>
                <option>Nail Art Design</option>
              </select>
            </label>

            <fieldset className="sm:col-span-2">
              <legend className="flex items-center gap-3 text-sm font-medium text-stone-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-xs font-semibold text-white">
                  1
                </span>
                Select Date
              </legend>
              {isLoadingAvailability ? (
                <p className="mt-3 rounded-2xl border border-rose-100 bg-[#fffaf7] px-4 py-5 text-sm text-stone-500">
                  Loading available dates...
                </p>
              ) : availabilityError ? (
                <p className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-sm text-rose-700">
                  {availabilityError}
                </p>
              ) : availableDates.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {availableDates.map((date) => {
                    const isSelected = selectedDate === date.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-rose-100 ${
                          isSelected
                            ? "border-stone-950 bg-stone-950 text-white shadow-stone-200"
                            : "border-rose-100 bg-[#fffaf7] text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98]"
                        }`}
                        key={date.id}
                        onClick={() => {
                          if (selectedDate !== date.id) {
                            setSelectedTime("");
                            setSelectedSlotId("");
                          }

                          setSelectedDate(date.id);
                          setBookingMessage(null);
                        }}
                        type="button"
                      >
                        <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                          {date.weekday}
                        </span>
                        <span className="mt-1 block text-base font-semibold">
                          {date.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border border-rose-100 bg-[#fffaf7] px-4 py-5 text-sm text-stone-500">
                  All appointment slots are currently booked.
                </p>
              )}
            </fieldset>

            <fieldset className="sm:col-span-2" disabled={!selectedDateOption}>
              <legend className="flex items-center gap-3 text-sm font-medium text-stone-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700">
                  2
                </span>
                Select Time
              </legend>
              {selectedDateOption ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {availableTimeSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-full border px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-rose-100 ${
                          isSelected
                            ? "border-stone-950 bg-stone-950 text-white shadow-stone-200"
                            : "border-rose-100 bg-[#fffaf7] text-stone-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98]"
                        }`}
                        key={slot.id}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setSelectedSlotId(slot.id);
                          setBookingMessage(null);
                        }}
                        type="button"
                      >
                        {formatSlotTime(slot.time)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border border-dashed border-rose-100 bg-[#fffaf7] px-4 py-5 text-sm text-stone-500">
                  Choose a date first to reveal available appointment times.
                </p>
              )}
            </fieldset>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">
                Appointment Notes
              </span>
              <textarea
                className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-stone-200 bg-[#fffaf7] px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
                placeholder="Tell us about your preferred shape, color, or occasion."
              />
            </label>

            <div className="sm:col-span-2">
              <button
                className="w-full rounded-2xl bg-stone-950 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-stone-200 transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                disabled={
                  isSubmittingBooking ||
                  !selectedDateOption ||
                  !selectedTime ||
                  !selectedSlot
                }
                type="submit"
              >
                {isSubmittingBooking ? "Saving..." : "Request Appointment"}
              </button>
              {bookingMessage ? (
                <p
                  aria-live="polite"
                  className={`mt-3 text-center text-sm font-medium ${
                    bookingMessage.type === "success"
                      ? "text-rose-600"
                      : "text-red-600"
                  }`}
                  role={bookingMessage.type === "error" ? "alert" : "status"}
                >
                  {bookingMessage.text}
                </p>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
