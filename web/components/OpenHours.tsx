import { parseHours } from "@/lib/types";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function OpenHours({ raw }: { raw: string | null }) {
  const hours = parseHours(raw);
  if (!hours) return null;

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Karachi",
  }).format(new Date());

  const days = DAYS.filter((d) => hours[d]);
  if (days.length === 0) return null;

  return (
    <dl className="divide-y divide-line text-sm">
      {days.map((day) => {
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`flex justify-between gap-4 py-1.5 ${
              isToday ? "font-semibold text-ink" : "text-ink-soft"
            }`}
          >
            <dt>
              {day}
              {isToday && <span className="ml-2 text-xs text-clay">today</span>}
            </dt>
            <dd className="text-right">{hours[day].join(", ")}</dd>
          </div>
        );
      })}
    </dl>
  );
}
