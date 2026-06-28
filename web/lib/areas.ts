// the scraped area/address text is messy ("KDA Scheme #1 KDA Scheme 1", society
// names, plus codes), so we fold each venue onto a canonical karachi area for the
// chips. checked most-specific-first. anything that still doesn't match lands in
// the "Elsewhere" bucket on the browse page so the counts always add up.
export const KARACHI_AREAS = [
  "Clifton",
  "DHA",
  "Gulshan-e-Iqbal",
  "Gulistan-e-Johar",
  "PECHS",
  "Bahadurabad",
  "Federal B Area",
  "North Nazimabad",
  "Nazimabad",
  "Civil Lines",
  "Cantt",
  "Jamshed Quarters",
  "Scheme 33",
  "Tariq Road",
  "Korangi",
  "Malir",
  "Saddar",
  "KDA Scheme",
  "Bahria Town",
  "Shahrah-e-Faisal",
];

// extra spellings / landmarks -> canonical. checked before the list above.
const ALIASES: Record<string, string> = {
  defence: "DHA",
  "d.h.a": "DHA",
  johar: "Gulistan-e-Johar",
  gulshan: "Gulshan-e-Iqbal",
  pechs: "PECHS",
  "p.e.c.h.s": "PECHS",
  "federal b": "Federal B Area",
  "f.b. area": "Federal B Area",
  "fb area": "Federal B Area",
  gulberg: "Federal B Area",
  hussainabad: "Federal B Area",
  cantonment: "Cantt",
  cantt: "Cantt",
  karsaz: "Cantt",
  askari: "Cantt",
  dohs: "Cantt",
  "naval officers": "Cantt",
  bizerta: "Cantt",
  muslimabad: "Jamshed Quarters",
  jamshed: "Jamshed Quarters",
  "gulzar-e-hijri": "Scheme 33",
  "gulzar e hijri": "Scheme 33",
  "scheme 33": "Scheme 33",
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
