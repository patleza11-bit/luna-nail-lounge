"use client";

import type { CalendarView } from "@/app/admin/calendar/_lib/calendar-types";

type CalendarToolbarProps = {
  view: CalendarView;
  title: string;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
};

const views: { label: string; value: CalendarView }[] = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "day" },
];

export function CalendarToolbar({
  view,
  title,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onRefresh,
  isRefreshing,
}: CalendarToolbarProps) {
  return (
    <div className="rounded-lg border border-[#eadbd1] bg-white p-3 shadow-sm shadow-[#eadbd1]/30">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#9f635d]">Calendar view</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#2f2824]">
            {title}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 rounded-lg bg-[#fffaf6] p-1">
            {views.map((viewOption) => (
              <button
                aria-pressed={view === viewOption.value}
                className={`min-h-11 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#eadbd1] ${
                  view === viewOption.value
                    ? "bg-[#2f2824] text-white"
                    : "text-[#6f625b] hover:bg-white hover:text-[#8c5751]"
                }`}
                key={viewOption.value}
                onClick={() => onViewChange(viewOption.value)}
                type="button"
              >
                {viewOption.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
            <button
              className="min-h-11 rounded-lg border border-[#eadbd1] px-3 text-sm font-semibold text-[#5f544f] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              onClick={onPrevious}
              type="button"
            >
              Prev
            </button>
            <button
              className="min-h-11 rounded-lg bg-[#f7d8d0] px-3 text-sm font-semibold text-[#2f2824] transition hover:bg-[#f4c8bf] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              onClick={onToday}
              type="button"
            >
              Today
            </button>
            <button
              className="min-h-11 rounded-lg border border-[#eadbd1] px-3 text-sm font-semibold text-[#5f544f] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
              onClick={onNext}
              type="button"
            >
              Next
            </button>
          </div>

          <button
            className="min-h-11 rounded-lg border border-[#d8bcb2] px-4 text-sm font-semibold text-[#6f4f45] transition hover:bg-[#fffaf6] focus:outline-none focus:ring-4 focus:ring-[#eadbd1]"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
