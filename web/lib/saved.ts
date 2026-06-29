// client-side "tonight" shortlist, stored in localStorage (no accounts needed).
// we keep enough display info to render the saved list without a round-trip.
export type SavedItem = {
  slug: string;
  name: string;
  sub: string | null;
  area: string | null;
  rating: number | null;
  reviews: number | null;
  photo: string | null;
};

const KEY = "niklo:saved";
export const SAVED_EVENT = "niklo-saved";

export function readSaved(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeSaved(items: SavedItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function toggleSaved(item: SavedItem): boolean {
  const items = readSaved();
  const exists = items.some((i) => i.slug === item.slug);
  writeSaved(exists ? items.filter((i) => i.slug !== item.slug) : [...items, item]);
  return !exists;
}

export function removeSaved(slug: string) {
  writeSaved(readSaved().filter((i) => i.slug !== slug));
}

export function isSaved(slug: string): boolean {
  return readSaved().some((i) => i.slug === slug);
}

// add several at once (a friend taking a shared plan onto their own list).
// only adds the ones not already saved; returns how many were newly added.
export function addManySaved(incoming: SavedItem[]): number {
  const items = readSaved();
  const have = new Set(items.map((i) => i.slug));
  const fresh = incoming.filter((i) => !have.has(i.slug));
  if (fresh.length) writeSaved([...items, ...fresh]);
  return fresh.length;
}
