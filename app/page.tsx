"use client";

import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { GalleryImagePreview } from "@/app/components/gallery-image-preview";
import { formatSupabaseError } from "@/app/lib/supabase-errors";

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

type GalleryImageRow = {
  id: string | number;
  image_url?: string | null;
  alt_text?: string | null;
  created_at?: string | null;
};

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string;
  caption: string;
  createdAt: string;
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
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryError, setGalleryError] = useState("");
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
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

  const fetchGalleryImages = useCallback(async () => {
    await Promise.resolve();

    if (!supabase) {
      setGalleryImages([]);
      setIsLoadingGallery(false);
      return;
    }

    try {
      setIsLoadingGallery(true);

      const { data, error } = await supabase
        .from("gallery_images")
        .select("id,image_url,alt_text,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(
          "Supabase gallery_images error:",
          JSON.stringify(formatSupabaseError(error), null, 2),
        );
        setGalleryError("Gallery images could not be loaded right now.");
        setGalleryImages([]);
        return;
      }

      const images = ((data ?? []) as GalleryImageRow[])
        .filter((image) => image.id && image.image_url)
        .map((image) => {
          const caption = image.alt_text?.trim() ?? "";

          return {
            id: String(image.id),
            imageUrl: String(image.image_url),
            altText:
              caption || "Nail salon gallery image from Beauty Nail Lounge",
            caption,
            createdAt: image.created_at ?? "",
          };
        });

      setGalleryImages(images);
      setGalleryError("");
    } catch (error) {
      console.error(
        "Unexpected gallery load error:",
        JSON.stringify(formatSupabaseError(error), null, 2),
      );
      setGalleryError("Gallery images could not be loaded right now.");
      setGalleryImages([]);
    } finally {
      setIsLoadingGallery(false);
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

  useEffect(() => {
    const galleryTimer = window.setTimeout(() => {
      fetchGalleryImages();
    }, 0);

    return () => {
      window.clearTimeout(galleryTimer);
    };
  }, [fetchGalleryImages]);

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
      description:
        "Glossy, chip-resistant color finished with meticulous cuticle care.",
      price: "From $45",
    },
    {
      name: "Acrylic Full Set",
      description:
        "Sculpted length and shape customized for a refined, polished look.",
      price: "From $70",
    },
    {
      name: "Deluxe Pedicure",
      description:
        "A restorative foot ritual with exfoliation, massage, and luxe polish.",
      price: "From $58",
    },
    {
      name: "Nail Art Design",
      description: "Minimal accents, chrome finishes, and bespoke detail work.",
      price: "From $18",
    },
  ];

  const trustCards = [
    {
      title: "Clean, Relaxing Salon Experience",
      description:
        "A calm setting with thoughtful sanitation and a comfortable appointment flow.",
    },
    {
      title: "Licensed Nail Care",
      description:
        "Professional techniques, careful prep, and nail health considered at every visit.",
    },
    {
      title: "Easy Online Booking",
      description:
        "Choose an available date and time from the booking form without extra back and forth.",
    },
    {
      title: "Friendly, Appointment-Focused Service",
      description:
        "Warm service paced around your appointment so each visit feels considered.",
    },
  ];

  const whyChooseCopy = [
    "Beauty Nail Lounge is designed for clients who want beautiful nails in a space that feels clean, calm, and cared for.",
    "From classic manicures to detailed nail art, each service is approached with a steady eye for shape, finish, and comfort.",
    "The booking experience is kept simple and appointment focused, so you can choose a time, share your details, and feel confident about your visit.",
  ];

  // Replace these placeholder business details with the salon's real contact information.
  const businessInfo = [
    {
      label: "Address",
      value: "123 Main Street, Suite 100, Your City, ST 00000",
    },
    {
      label: "Phone",
      value: "(555) 123-4567",
    },
    {
      label: "Hours",
      value: "Mon-Sat: 10:00 AM - 7:00 PM",
    },
    {
      label: "Instagram",
      value: "@beautynailounge",
    },
  ];

  // Placeholder testimonials: replace these sample quotes with real client reviews before publishing.
  const testimonials = [
    {
      quote:
        "The space felt calm and clean, and my manicure looked polished without feeling rushed.",
      name: "Sample Client",
      detail: "Placeholder review",
    },
    {
      quote:
        "Booking was simple, and the appointment felt personal from start to finish.",
      name: "Sample Client",
      detail: "Placeholder review",
    },
    {
      quote:
        "A soft, professional salon experience with careful attention to detail.",
      name: "Sample Client",
      detail: "Placeholder review",
    },
  ];

  return (
    <main className="min-h-screen bg-[#fffaf6] text-[#2f2824]">
      <nav className="sticky top-0 z-50 border-b border-[#eadbd1] bg-[#fffaf6]/95 px-5 backdrop-blur-md sm:px-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <a
            className="shrink-0 text-sm font-semibold uppercase tracking-[0.22em] text-[#6f4f45] transition hover:text-[#9f635d] sm:text-base"
            href="#home"
          >
            Beauty Nail Lounge
          </a>
          <div className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#6f625b] md:flex">
            <a
              className="transition hover:text-[#9f635d]"
              href="#services"
            >
              Services
            </a>
            <a
              className="transition hover:text-[#9f635d]"
              href="#gallery"
            >
              Gallery
            </a>
            <a
              className="transition hover:text-[#9f635d]"
              href="#why"
            >
              Why Beauty
            </a>
            <a
              className="transition hover:text-[#9f635d]"
              href="#visit"
            >
              Visit
            </a>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#eadbd1] px-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f625b] transition hover:border-[#d6a9a1] hover:text-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] md:hidden"
              href="#gallery"
            >
              Gallery
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2f2824] px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] sm:px-5"
              href="#book"
            >
              Book
            </a>
          </div>
        </div>
      </nav>

      <header
        id="home"
        className="relative isolate flex min-h-[72svh] scroll-mt-16 items-center overflow-hidden bg-[#2f2824] px-6 py-20 text-white sm:px-10 sm:py-24 lg:py-28"
      >
        <Image
          alt="Elegant manicured nails at Beauty Nail Lounge"
          className="object-cover object-center"
          fill
          preload
          sizes="100vw"
          src="/hero-nails.png"
        />
        <div className="absolute inset-0 bg-[#2f2824]/24" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2f2824]/64 via-[#2f2824]/28 to-[#2f2824]/5" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fffaf6] to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#f6d8d0]">
              Modern Nail Care In A Calm Salon Setting
            </p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-tight tracking-normal text-white drop-shadow-[0_4px_18px_rgba(47,40,36,0.45)] sm:text-6xl lg:text-7xl">
              Beautiful nails, thoughtfully cared for.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#fff4ee] drop-shadow-[0_2px_12px_rgba(47,40,36,0.45)] sm:text-lg">
              Beauty Nail Lounge offers clean, appointment-focused nail care with
              a soft, polished experience from booking to final coat.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f7d8d0] px-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f2824] shadow-lg shadow-[#2f2824]/20 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-white/30"
                href="#book"
              >
                Book an Appointment
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/45 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
                href="#services"
              >
                View Services
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#fff4ee]">
              <span>Clean salon experience</span>
              <span>Licensed nail care</span>
              <span>Simple online booking</span>
            </div>
          </div>
        </div>
      </header>

      <section
        aria-label="Beauty Nail Lounge trust highlights"
        className="px-6 py-12 sm:px-10 lg:py-14"
      >
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustCards.map((card) => (
            <article
              className="rounded-lg border border-[#eadbd1] bg-white p-5 shadow-sm shadow-[#eadbd1]/40"
              key={card.title}
            >
              <div className="mb-4 h-1 w-10 bg-[#b98a7d]" />
              <h2 className="text-base font-semibold text-[#2f2824]">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6f625b]">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="why"
        className="scroll-mt-24 border-y border-[#eadbd1] bg-[#f8efe9] px-6 py-16 sm:px-10 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
              Why Choose Beauty Nail Lounge?
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#2f2824] sm:text-4xl">
              A more polished way to enjoy your nail appointment.
            </h2>
          </div>
          <div className="space-y-5 border-l border-[#cfada2] pl-6 text-base leading-8 text-[#5f544f] sm:pl-8">
            {whyChooseCopy.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section
        id="services"
        className="scroll-mt-24 bg-[#fcf1f4] px-6 py-16 sm:px-10 lg:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#a45f6b]">
                <span className="h-px w-10 bg-[#d8a6b0]" />
                Services
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2f2824] sm:text-4xl">
                Services for polished, everyday beauty.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#6f625b]">
                Choose a signature service now and update details during your
                appointment if needed.
              </p>
            </div>

            <div className="relative isolate lg:pl-4">
              <div
                aria-hidden="true"
                className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-[#e8b6c0]/55 via-[#f5d8df]/40 to-transparent blur-2xl"
              />
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/80 bg-white shadow-[0_24px_70px_rgba(159,99,93,0.2)]">
                <Image
                  alt="Warm nail salon lounge with manicure stations"
                  className="object-cover"
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  src="/nail-salon.png"
                />
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article
                key={service.name}
                className="group rounded-lg border border-[#ead2d8] bg-[#fffdfb] p-6 shadow-sm shadow-[#d8a6b0]/25 transition-all duration-300 hover:-translate-y-1 hover:border-[#d8a6b0] hover:shadow-xl hover:shadow-[#b56f7c]/20"
              >
                <div className="mb-5 h-px w-12 bg-[#c98795] transition-all duration-300 group-hover:w-16 group-hover:bg-[#a45f6b]" />
                <h3 className="text-xl font-semibold text-[#2f2824]">
                  {service.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#6f625b]">
                  {service.description}
                </p>
                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#a45f6b]">
                  {service.price}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="book"
        className="scroll-mt-24 bg-[#f4e5dd] px-6 py-16 sm:px-10 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
              Reserve Your Visit
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#2f2824] sm:text-4xl">
              Book an appointment online.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#5f544f]">
              Select an available date and time, choose your service, and send
              your appointment request. Availability still comes directly from
              the existing booking system.
            </p>
          </div>

          <div className="rounded-lg border border-[#d8bcb2] bg-white p-5 shadow-xl shadow-[#d8bcb2]/35 sm:p-8">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
              Appointment Request
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#2f2824]">
              Choose Your Time
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#6f625b] sm:text-base">
              We will save your request and update availability after booking.
            </p>
          </div>

          <form
            className="grid gap-5 sm:grid-cols-2"
            noValidate
            onSubmit={handleBookingSubmit}
          >
            <label className="block">
              <span className="text-sm font-medium text-[#5f544f]">Name</span>
              <input
                className="mt-2 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 py-3 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
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
              <span className="text-sm font-medium text-[#5f544f]">Phone</span>
              <input
                className="mt-2 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 py-3 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
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
              <span className="text-sm font-medium text-[#5f544f]">
                Service
              </span>
              <select
                className="mt-2 w-full rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 py-3 text-[#2f2824] outline-none transition focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
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
              <legend className="flex items-center gap-3 text-sm font-medium text-[#5f544f]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2824] text-xs font-semibold text-white">
                  1
                </span>
                Select Date
              </legend>
              {isLoadingAvailability ? (
                <p className="mt-3 rounded-lg border border-[#eadbd1] bg-[#fffaf6] px-4 py-5 text-sm text-[#6f625b]">
                  Loading available dates...
                </p>
              ) : availabilityError ? (
                <p className="mt-3 rounded-lg border border-[#e8beb6] bg-[#fff2ef] px-4 py-5 text-sm text-[#9f3f36]">
                  {availabilityError}
                </p>
              ) : availableDates.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {availableDates.map((date) => {
                    const isSelected = selectedDate === date.id;

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`rounded-lg border px-4 py-4 text-left shadow-sm transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
                          isSelected
                            ? "border-[#2f2824] bg-[#2f2824] text-white shadow-[#d8bcb2]"
                            : "border-[#eadbd1] bg-[#fffaf6] text-[#5f544f] hover:border-[#b98a7d] hover:bg-[#f9eee9] hover:text-[#8c5751] active:scale-[0.98]"
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
                <p className="mt-3 rounded-lg border border-[#eadbd1] bg-[#fffaf6] px-4 py-5 text-sm text-[#6f625b]">
                  All appointment slots are currently booked.
                </p>
              )}
            </fieldset>

            <fieldset className="sm:col-span-2" disabled={!selectedDateOption}>
              <legend className="flex items-center gap-3 text-sm font-medium text-[#5f544f]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eadbd1] text-xs font-semibold text-[#8c5751]">
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
                        className={`rounded-full border px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
                          isSelected
                            ? "border-[#2f2824] bg-[#2f2824] text-white shadow-[#d8bcb2]"
                            : "border-[#eadbd1] bg-[#fffaf6] text-[#5f544f] hover:border-[#b98a7d] hover:bg-[#f9eee9] hover:text-[#8c5751] active:scale-[0.98]"
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
                <p className="mt-3 rounded-lg border border-dashed border-[#d8bcb2] bg-[#fffaf6] px-4 py-5 text-sm text-[#6f625b]">
                  Choose a date first to reveal available appointment times.
                </p>
              )}
            </fieldset>

            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-[#5f544f]">
                Appointment Notes
              </span>
              <textarea
                className="mt-2 min-h-28 w-full resize-none rounded-lg border border-[#ded0c8] bg-[#fffaf6] px-4 py-3 text-[#2f2824] outline-none transition placeholder:text-[#9d8d85] focus:border-[#b98a7d] focus:ring-4 focus:ring-[#eadbd1]"
                placeholder="Tell us about your preferred shape, color, or occasion."
              />
            </label>

            <div className="sm:col-span-2">
              <button
                className="w-full rounded-lg bg-[#2f2824] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-lg shadow-[#d8bcb2] transition hover:bg-[#9f635d] focus:outline-none focus:ring-4 focus:ring-[#eadbd1] disabled:cursor-not-allowed disabled:bg-[#cdbfba] disabled:text-[#786c66] disabled:shadow-none"
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
                      ? "text-[#8c5751]"
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
        </div>
      </section>

      <section
        id="gallery"
        className="scroll-mt-24 border-y border-[#eadbd1] bg-[#fffaf6] px-6 py-16 sm:px-10 lg:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
                <span className="h-px w-10 bg-[#d8bcb2]" />
                Gallery
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[#2f2824] sm:text-4xl">
                Recent nail looks from the lounge.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#6f625b] lg:ml-auto">
              A polished look at the finishes, shapes, and details clients can
              bring into their next appointment.
            </p>
          </div>

          {isLoadingGallery ? (
            <div
              className="rounded-lg border border-dashed border-[#d8bcb2] bg-white px-5 py-10 text-center text-sm font-medium text-[#6f625b]"
              role="status"
            >
              Loading gallery...
            </div>
          ) : galleryImages.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image) => (
                <figure
                  className="group overflow-hidden rounded-lg border border-[#eadbd1] bg-white shadow-sm shadow-[#d8bcb2]/35 transition duration-300 hover:-translate-y-1 hover:border-[#d6a9a1] hover:shadow-xl hover:shadow-[#d8bcb2]/40"
                  key={image.id}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f8efe9]">
                    <GalleryImagePreview
                      alt={image.altText}
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      src={image.imageUrl}
                    />
                  </div>
                  {image.caption ? (
                    <figcaption className="px-4 py-3 text-sm leading-6 text-[#6f625b]">
                      {image.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#d8bcb2] bg-white px-5 py-12 text-center shadow-sm shadow-[#eadbd1]/35">
              <p className="text-lg font-semibold text-[#2f2824]">
                Gallery coming soon.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#6f625b]">
                {galleryError
                  ? "Gallery photos are temporarily unavailable. Please check back soon."
                  : "Fresh manicure and nail art photos will appear here once the salon owner uploads them."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#9f635d]">
              Reviews
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-[#2f2824] sm:text-4xl">
              Kind words from future clients.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure
                className="rounded-lg border border-[#eadbd1] bg-white p-6 shadow-sm shadow-[#eadbd1]/40"
                key={testimonial.quote}
              >
                <blockquote className="text-base leading-7 text-[#5f544f]">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <figcaption className="mt-6 border-t border-[#eadbd1] pt-4">
                  <p className="font-semibold text-[#2f2824]">
                    {testimonial.name}
                  </p>
                  <p className="mt-1 text-sm uppercase tracking-[0.16em] text-[#9f635d]">
                    {testimonial.detail}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section
        id="visit"
        className="scroll-mt-24 border-t border-[#eadbd1] bg-[#2f2824] px-6 py-16 text-white sm:px-10 lg:py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#f0cfc7]">
              Visit Beauty
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
              Business information placeholders.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#f7e7e1]">
              Update these details when you are ready to publish the live
              address, phone number, hours, and Instagram handle.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            {businessInfo.map((item) => (
              <div
                className="rounded-lg border border-white/15 bg-white/10 p-5"
                key={item.label}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f0cfc7]">
                  {item.label}
                </dt>
                <dd className="mt-3 text-base leading-7 text-white">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}
