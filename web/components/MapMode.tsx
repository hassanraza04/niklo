"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categoryIcon } from "@/lib/icons";
import {
  filteredMapVenues,
  mapBounds,
  mapPointStyle,
  primaryCategorySlug,
  type MapVenue,
} from "@/lib/mapMode";
import type { Category } from "@/lib/taxonomy";
import { useUserLocation } from "@/lib/useUserLocation";

const CATEGORY_STYLES: Record<string, { pin: string; dot: string }> = {
  "sports-active": { pin: "bg-pine text-paper", dot: "bg-pine" },
  entertainment: { pin: "bg-clay text-paper", dot: "bg-clay" },
  "outdoors-adventure": { pin: "bg-marigold text-ink", dot: "bg-marigold" },
  "creative-chill": { pin: "bg-ink text-paper", dot: "bg-ink" },
  culture: { pin: "bg-paper-2 text-ink", dot: "bg-paper-2" },
};

function categoryStyle(slug: string) {
  return CATEGORY_STYLES[slug] ?? { pin: "bg-card text-ink", dot: "bg-card" };
}

function venueLabel(venue: MapVenue) {
  return [venue.subcategory_name, venue.area].filter(Boolean).join(" · ");
}

export function MapMode({
  venues,
  categories,
}: {
  venues: MapVenue[];
  categories: Category[];
}) {
  const categorySlugs = categories.map((category) => category.slug);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(categorySlugs),
  );
  const [activeSlug, setActiveSlug] = useState(venues[0]?.slug ?? "");
  const { location, status, requestLocation } = useUserLocation();

  const visibleVenues = useMemo(
    () => filteredMapVenues(venues, selectedCategories),
    [venues, selectedCategories],
  );
  const bounds = useMemo(
    () => mapBounds(visibleVenues, location),
    [visibleVenues, location],
  );
  const activeVenue =
    visibleVenues.find((venue) => venue.slug === activeSlug) ?? visibleVenues[0] ?? null;

  function toggleCategory(slug: string) {
    setSelectedCategories((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-lg italic text-clay">Map</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-ink">
            Entertainment near you
          </h1>
          <p className="mt-2 max-w-2xl text-ink-soft">
            Browse Karachi by place, type, and distance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSelectedCategories(new Set(categorySlugs))}
            className="rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink hover:border-clay/40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategories(new Set())}
            className="rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink hover:border-clay/40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={requestLocation}
            disabled={status === "loading"}
            className="rounded-full bg-pine px-4 py-2 font-semibold text-paper disabled:opacity-60"
          >
            {status === "loading"
              ? location
                ? "Updating..."
                : "Finding you..."
              : location
                ? "Update location"
                : "Show me"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-[var(--radius-card)] border border-line bg-card p-4">
          <h2 className="font-display text-xl font-semibold text-ink">Types</h2>
          <div className="mt-4 space-y-2">
            {categories.map((category) => {
              const active = selectedCategories.has(category.slug);
              const count = venues.filter((venue) =>
                (venue.category_slugs ?? venue.category_slug ?? "")
                  .split(",")
                  .includes(category.slug),
              ).length;
              return (
                <label
                  key={category.slug}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:border-clay/40"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleCategory(category.slug)}
                      className="h-4 w-4 shrink-0 accent-pine"
                    />
                    <span className="truncate">
                      {categoryIcon(category.slug)} {category.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">{count}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Showing {visibleVenues.length} of {venues.length} mapped places.
          </p>
          {status === "denied" && (
            <p className="mt-3 text-sm text-clay-dark">
              Location is blocked in your browser settings.
            </p>
          )}
        </aside>

        <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="relative min-h-[520px] overflow-hidden rounded-[var(--radius-card)] border border-line bg-[#e8efe5] sm:min-h-[580px]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,39,36,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(43,39,36,0.08)_1px,transparent_1px)] bg-[size:56px_56px]" />
            <div className="absolute right-0 top-0 h-full w-1/4 bg-[#c9ded8]" />
            <div className="absolute bottom-6 left-8 rounded-full border border-pine/20 bg-paper/75 px-3 py-1 text-xs font-semibold text-pine">
              Karachi
            </div>
            {visibleVenues.map((venue) => {
              const category = primaryCategorySlug(venue);
              const style = mapPointStyle(venue, bounds);
              const active = venue.slug === activeVenue?.slug;
              return (
                <button
                  key={venue.slug}
                  type="button"
                  onClick={() => setActiveSlug(venue.slug)}
                  className={`absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-paper text-sm font-semibold shadow-md transition hover:z-20 hover:scale-110 ${
                    active ? "scale-125 ring-4 ring-marigold/40" : ""
                  } ${categoryStyle(category).pin}`}
                  style={{ left: `${style.left}%`, top: `${style.top}%` }}
                  title={venue.name}
                >
                  {categoryIcon(category)}
                </button>
              );
            })}
            {location && (
              <div
                className="absolute z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-paper bg-blue-600 text-xs font-bold text-white shadow-lg ring-4 ring-blue-500/20"
                style={{
                  left: `${mapPointStyle(location, bounds).left}%`,
                  top: `${mapPointStyle(location, bounds).top}%`,
                }}
                title="You"
              >
                You
              </div>
            )}
            {!visibleVenues.length && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <div className="rounded-[var(--radius-card)] border border-line bg-card p-6 text-ink-soft">
                  Select at least one type to see places on the map.
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-[var(--radius-card)] border border-line bg-card p-4">
            {activeVenue ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-pine">
                      {venueLabel(activeVenue)}
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-ink">
                      {activeVenue.name}
                    </h2>
                  </div>
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${categoryStyle(primaryCategorySlug(activeVenue)).dot}`}
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm text-ink-soft">
                  {activeVenue.rating && (
                    <p>
                      ★ {activeVenue.rating.toFixed(1)}
                      {activeVenue.review_count
                        ? ` · ${activeVenue.review_count} reviews`
                        : ""}
                    </p>
                  )}
                  {activeVenue.area && <p>{activeVenue.area}</p>}
                </div>
                <Link
                  href={`/v/${activeVenue.slug}`}
                  className="mt-5 inline-flex rounded-full bg-clay px-4 py-2 text-sm font-semibold text-paper transition hover:bg-clay-dark"
                >
                  Open place
                </Link>
              </>
            ) : (
              <p className="text-ink-soft">No place selected.</p>
            )}

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="font-display text-lg font-semibold text-ink">Visible places</h3>
              <div className="mt-3 max-h-80 space-y-2 overflow-auto pr-1">
                {visibleVenues.slice(0, 80).map((venue) => (
                  <button
                    key={venue.slug}
                    type="button"
                    onClick={() => setActiveSlug(venue.slug)}
                    className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      venue.slug === activeVenue?.slug
                        ? "border-clay bg-paper"
                        : "border-line bg-card hover:border-clay/40"
                    }`}
                  >
                    <span className="block truncate font-semibold text-ink">
                      {venue.name}
                    </span>
                    <span className="block truncate text-ink-soft">{venueLabel(venue)}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
