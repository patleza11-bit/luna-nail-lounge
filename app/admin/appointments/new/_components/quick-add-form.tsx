"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createQuickAppointment,
  type QuickAddState,
} from "@/app/admin/appointments/new/actions";

export type AvailableSlotOption = {
  id: string;
  date: string;
  time: string;
};

type QuickAddFormProps = {
  availableSlots: AvailableSlotOption[];
};

const services = [
  "Gel Manicure",
  "Acrylic Full Set",
  "Deluxe Pedicure",
  "Nail Art Design",
];

const initialState: QuickAddState = {
  error: "",
};

function slotTimeToInputValue(time: string) {
  const twelveHour = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!twelveHour) {
    return time;
  }

  let hours = Number(twelveHour[1]);
  const minutes = twelveHour[2] ?? "00";
  const meridiem = twelveHour[3].toUpperCase();

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return `${`${hours}`.padStart(2, "0")}:${minutes}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="min-h-12 w-full rounded-lg bg-[#2f2824] px-5 text-sm font-semibold text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#cdbfba] disabled:text-[#786c66] disabled:shadow-none"
      disabled={pending}
      type="submit"
    >
      {pending ? "Saving..." : "Save appointment"}
    </button>
  );
}

export function QuickAddForm({ availableSlots }: QuickAddFormProps) {
  const [state, action] = useActionState(createQuickAppointment, initialState);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const slotsForDate = useMemo(
    () => availableSlots.filter((slot) => slot.date === selectedDate),
    [availableSlots, selectedDate],
  );

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <input name="slotId" type="hidden" value={selectedSlotId} />

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">
          Customer name
        </span>
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="customerName"
          placeholder="Client name"
          required
          type="text"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">Phone</span>
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="phone"
          placeholder="(555) 123-4567"
          required
          type="tel"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">
          Email optional
        </span>
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="email"
          placeholder="client@example.com"
          type="email"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">Service</span>
        <select
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="service"
          required
        >
          {services.map((service) => (
            <option key={service}>{service}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">Date</span>
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="date"
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setSelectedSlotId("");
            setSelectedTime("");
          }}
          required
          type="date"
          value={selectedDate}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#5f544f]">Time</span>
        <input
          className="mt-2 min-h-12 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 text-[#2f2824] outline-none transition focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="time"
          onChange={(event) => {
            setSelectedTime(event.target.value);
            setSelectedSlotId("");
          }}
          required
          type="time"
          value={selectedTime}
        />
      </label>

      {selectedDate ? (
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-[#5f544f]">
            Available slots
          </legend>
          {slotsForDate.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {slotsForDate.map((slot) => (
                <button
                  aria-pressed={selectedSlotId === slot.id}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
                    selectedSlotId === slot.id
                      ? "border-[#2f2824] bg-[#2f2824] text-white"
                      : "border-[#eadbd1] bg-[#fffaf6] text-[#5f544f] hover:border-[#b98a7d] hover:text-[#8c5751]"
                  }`}
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlotId(slot.id);
                    setSelectedTime(slotTimeToInputValue(slot.time));
                  }}
                  type="button"
                >
                  {slot.time}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-3 text-sm text-[#6f625b]">
              No open slots for this date. You can still add a manual time.
            </p>
          )}
        </fieldset>
      ) : null}

      <label className="block sm:col-span-2">
        <span className="text-sm font-medium text-[#5f544f]">
          Notes optional
        </span>
        <textarea
          className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 py-3 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
          name="notes"
          placeholder="Shape, color, nail art, or timing notes."
        />
      </label>

      {state.error ? (
        <p
          className="rounded-lg border border-[#e8beb6] bg-[#fff2ef] px-4 py-3 text-sm text-[#9f3f36] sm:col-span-2"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
