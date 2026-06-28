import type { Venue } from "./types";
import { opensLate } from "./hours";

// editorial-ish collections. rule-based for now so they fill themselves from the
// data; later these can become hand-picked lists (first date, rainy day, etc.).
export type Collection = {
  slug: string;
  title: string;
  blurb: string;
  emoji: string;
  pick: (venues: Venue[]) => Venue[];
};

export const collections: Collection[] = [
  {
    slug: "top-rated",
    title: "Top rated",
    blurb: "The highest-rated spots across the city.",
    emoji: "⭐",
    pick: (vs) =>
      vs
        .filter((v) => (v.rating ?? 0) >= 4.8)
        .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0)),
  },
  {
    slug: "hidden-gems",
    title: "Hidden gems",
    blurb: "Quietly excellent, before everyone finds out.",
    emoji: "💎",
    pick: (vs) =>
      vs
        .filter((v) => (v.rating ?? 0) >= 4.6 && (v.review_count ?? 0) >= 3 && (v.review_count ?? 0) <= 40)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  },
  {
    slug: "open-late",
    title: "Open late",
    blurb: "For when the night is still young.",
    emoji: "🌙",
    pick: (vs) =>
      vs.filter((v) => opensLate(v.hours)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  },
];

export function getCollection(slug: string): Collection | undefined {
  return collections.find((c) => c.slug === slug);
}
