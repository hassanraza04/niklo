import { parseHours } from "./types";

// minutes-since-midnight for a time like "9 AM", "3 PM", "11:30 PM", or a bare
// "12" that inherits its AM/PM from the other end of the range.
function parseTime(s: string, fallbackMeridiem?: string): number | null {
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  const mer = (m[3] ? m[3][0] : fallbackMeridiem || "").toLowerCase();
  if (mer !== "a" && mer !== "p") return null;
  let hr = parseInt(m[1], 10) % 12;
  if (mer === "p") hr += 12;
  return hr * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}

function meridiemOf(s: string): string | undefined {
  const m = s.match(/(am|pm)/i);
  return m ? m[1][0].toLowerCase() : undefined;
}

type DayState = { ranges: [number, number][]; closed: boolean };

// parse a day's entries (e.g. ["12–9 AM, 3 PM–12 AM"]) into [start,end] minute ranges.
function parseDay(entries: string[]): DayState {
  const ranges: [number, number][] = [];
  let sawClosed = false;
  for (const entry of entries) {
    const norm = entry.replace(/ | /g, " ").toLowerCase().trim();
    if (norm.includes("24 hour") || norm.includes("open 24")) {
      ranges.push([0, 1440]);
      continue;
    }
    for (const sub of norm.split(",")) {
      const s = sub.trim();
      if (!s) continue;
      if (s.includes("closed")) {
        sawClosed = true;
        continue;
      }
      const parts = s.split(/\s*(?:–|—|-|to)\s*/).filter(Boolean);
      if (parts.length !== 2) continue;
      const start = parseTime(parts[0], meridiemOf(parts[1]));
      const end = parseTime(parts[1]);
      if (start != null && end != null) ranges.push([start, end]);
    }
  }
  return { ranges, closed: sawClosed };
}

function inRange(nowMin: number, [start, end]: [number, number]): boolean {
  // end <= start means the range crosses midnight (e.g. 3 PM–12 AM, 8 PM–4 AM)
  return end > start ? nowMin >= start && nowMin < end : nowMin >= start || nowMin < end;
}

// is the venue open right now (Asia/Karachi)? null = unknown (no usable hours).
export function isOpenNow(raw: string | null): boolean | null {
  const hours = parseHours(raw);
  if (!hours) return null;

  const now = new Date();
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "long",
  }).format(now);
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = hm.split(":").map(Number);
  const nowMin = (h % 24) * 60 + m;

  const entries = hours[day];
  if (!entries || entries.length === 0) return null;
  const { ranges, closed } = parseDay(entries);
  if (ranges.length === 0) return closed ? false : null;
  return ranges.some((r) => inRange(nowMin, r));
}

// does this place stay open past midnight on any day? (a "night out" signal)
export function opensLate(raw: string | null): boolean {
  const hours = parseHours(raw);
  if (!hours) return false;
  for (const entries of Object.values(hours)) {
    for (const [start, end] of parseDay(entries).ranges) {
      if (end <= start || (start === 0 && end === 1440)) return true;
    }
  }
  return false;
}
