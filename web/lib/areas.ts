// the scraped area/address text is messy ("KDA Scheme #1 KDA Scheme 1", plus
// codes), so we fold each venue onto a canonical karachi neighbourhood for the
// area chips. order matters a little -- more specific names first.
export const KARACHI_AREAS = [
  "Clifton",
  "DHA",
  "Gulshan-e-Iqbal",
  "Gulistan-e-Johar",
  "PECHS",
  "Bahadurabad",
  "North Nazimabad",
  "Nazimabad",
  "Tariq Road",
  "Korangi",
  "Malir",
  "Saddar",
  "KDA Scheme",
  "Bahria Town",
  "Shahrah-e-Faisal",
];

// extra spellings -> canonical
const ALIASES: Record<string, string> = {
  defence: "DHA",
  "d.h.a": "DHA",
  johar: "Gulistan-e-Johar",
  gulshan: "Gulshan-e-Iqbal",
  pechs: "PECHS",
  "p.e.c.h.s": "PECHS",
};

export function canonicalArea(venue: {
  area?: string | null;
  address?: string | null;
}): string | null {
  const hay = `${venue.area ?? ""} ${venue.address ?? ""}`.toLowerCase();
  if (!hay.trim()) return null;
  for (const [alias, canon] of Object.entries(ALIASES)) {
    if (hay.includes(alias)) return canon;
  }
  for (const area of KARACHI_AREAS) {
    if (hay.includes(area.toLowerCase())) return area;
  }
  return null;
}
