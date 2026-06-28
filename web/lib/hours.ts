import { parseHours } from "./types";

// is the venue open right now (Asia/Karachi)? null = unknown (no hours data).
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

  const ranges = hours[day];
  if (!ranges || ranges.length === 0) return null;

  for (const rangeRaw of ranges) {
    const r = rangeRaw.replace(/ | /g, " ").toLowerCase().trim();
    if (r.includes("24 hour") || r.includes("open 24")) return true;
    if (r.includes("closed")) continue;
    const parts = r.split(/\s*(?:–|—|-|to)\s*/).filter(Boolean);
    if (parts.length !== 2) continue;
    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    if (start == null || end == null) continue;
    const open =
      end > start ? nowMin >= start && nowMin < end : nowMin >= start || nowMin < end;
    if (open) return true;
  }
  return false;
}

function parseTime(s: string): number | null {
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(a|p)m/i);
  if (!m) return null;
  let hr = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === "p") hr += 12;
  return hr * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}
