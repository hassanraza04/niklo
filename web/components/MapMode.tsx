"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { categoryIcon } from "@/lib/icons";
import {
  filteredMapVenues,
  mapVenueHasSubcategory,
  primaryCategorySlug,
  setCategorySubcategorySelection,
  type MapVenue,
} from "@/lib/mapMode";
import type { Category } from "@/lib/taxonomy";
import { useUserLocation } from "@/lib/useUserLocation";

const LeafletVenueMap = dynamic(
  () => import("./LeafletVenueMap").then((mod) => mod.LeafletVenueMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] min-h-[520px] w-full items-center justify-center bg-paper-2 text-sm font-semibold text-ink-soft sm:h-[620px] xl:h-full xl:min-h-[620px]">
        Loading map...
      </div>
    ),
  },
);

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
  const allSubcategorySlugs = useMemo(
    () =>
      new Set(
        venues.flatMap((venue) =>
          (venue.subcategories ?? venue.subcategory_slug ?? "")
            .split(",")
            .map((slug) => slug.trim())
            .filter(Boolean),
        ),
      ),
    [venues],
  );
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(
    () => new Set(allSubcategorySlugs),
  );
  const [openSubcategoryMenu, setOpenSubcategoryMenu] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState(venues[0]?.slug ?? "");
  const [fitSignal, setFitSignal] = useState(0);
  const [focusVenueSignal, setFocusVenueSignal] = useState(0);
  const [focusUserSignal, setFocusUserSignal] = useState(0);
  const { location, status, requestLocation } = useUserLocation();

  const selectedCategories = useMemo(
    () =>
      new Set(
        categories
          .filter((category) =>
            category.subcategories.some((subcategory) =>
              selectedSubcategories.has(subcategory.slug),
            ),
          )
          .map((category) => category.slug),
      ),
    [categories, selectedSubcategories],
  );
  const visibleVenues = useMemo(
    () => filteredMapVenues(venues, selectedCategories, selectedSubcategories),
    [venues, selectedCategories, selectedSubcategories],
  );
  const activeVenue =
    visibleVenues.find((venue) => venue.slug === activeSlug) ?? visibleVenues[0] ?? null;
  const selectVenue = useCallback((slug: string) => setActiveSlug(slug), []);
  const revealVenue = useCallback((slug: string) => {
    setActiveSlug(slug);
    setFocusVenueSignal((current) => current + 1);
  }, []);

  function locateUser() {
    requestLocation();
    setFocusUserSignal((current) => current + 1);
  }

  function setCategorySelection(subcategorySlugs: string[], selected: boolean) {
    setSelectedSubcategories((current) =>
      setCategorySubcategorySelection(current, subcategorySlugs, selected),
    );
  }

  function toggleSubcategory(subcategorySlug: string) {
    setSelectedSubcategories((current) => {
      const next = new Set(current);
      if (next.has(subcategorySlug)) next.delete(subcategorySlug);
      else next.add(subcategorySlug);
      return next;
    });
  }

  function selectEveryType() {
    setSelectedSubcategories(new Set(allSubcategorySlugs));
  }

  function clearFilters() {
    setSelectedSubcategories(new Set());
    setOpenSubcategoryMenu(null);
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
            onClick={selectEveryType}
            className="rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink hover:border-clay/40"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink hover:border-clay/40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={locateUser}
            disabled={status === "loading"}
            className="rounded-full bg-pine px-4 py-2 font-semibold text-paper disabled:opacity-60"
          >
            {status === "loading"
              ? location
                ? "Updating..."
                : "Finding you..."
              : location
                ? "Locate me"
                : "Find me"}
          </button>
          <button
            type="button"
            onClick={() => setFitSignal((current) => current + 1)}
            className="rounded-full border border-line bg-card px-4 py-2 font-semibold text-ink hover:border-clay/40"
          >
            Fit map
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[var(--radius-card)] border border-line bg-card p-4">
          <h2 className="font-display text-xl font-semibold text-ink">Types</h2>
          <div className="mt-4 space-y-2">
            {categories.map((category) => {
              const count = venues.filter((venue) =>
                (venue.category_slugs ?? venue.category_slug ?? "")
                  .split(",")
                  .includes(category.slug),
              ).length;
              const mappedSubcategories = category.subcategories
                .map((subcategory) => ({
                  ...subcategory,
                  count: venues.filter((venue) =>
                    mapVenueHasSubcategory(venue, subcategory.slug),
                  ).length,
                }))
                .filter((subcategory) => subcategory.count > 0);
              const subcategorySlugs = mappedSubcategories.map((subcategory) => subcategory.slug);
              const selectedSubcategoryCount = mappedSubcategories.filter((subcategory) =>
                selectedSubcategories.has(subcategory.slug),
              ).length;
              const allSubcategoriesSelected =
                mappedSubcategories.length > 0 &&
                selectedSubcategoryCount === mappedSubcategories.length;
              const someSubcategoriesSelected = selectedSubcategoryCount > 0;
              const subcategoryMenuOpen = openSubcategoryMenu === category.slug;
              return (
                <div
                  key={category.slug}
                  className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink transition hover:border-clay/40"
                >
                  <div className="flex items-center justify-between gap-2">
                  <label className="flex min-w-0 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSubcategoriesSelected}
                      ref={(input) => {
                        if (input) input.indeterminate =
                          someSubcategoriesSelected && !allSubcategoriesSelected;
                      }}
                      onChange={() =>
                        setCategorySelection(subcategorySlugs, !allSubcategoriesSelected)
                      }
                      className="h-4 w-4 shrink-0 accent-pine"
                    />
                    <span className="truncate">
                      {categoryIcon(category.slug)} {category.name}
                    </span>
                    </label>
                    <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-ink-soft">{count}</span>
                    {mappedSubcategories.length > 0 && (
                      <button
                          type="button"
                          aria-expanded={subcategoryMenuOpen}
                          aria-controls={`subtypes-${category.slug}`}
                          onClick={() =>
                            setOpenSubcategoryMenu((current) =>
                              current === category.slug ? null : category.slug,
                            )
                          }
                          className="h-7 rounded-md border border-line bg-card px-2 text-xs font-semibold text-ink-soft hover:border-clay/40"
                        >
                          {subcategoryMenuOpen ? "Close" : "Subtypes"}
                        </button>
                    )}
                  </span>
                  </div>
                  {subcategoryMenuOpen && (
                    <div
                      id={`subtypes-${category.slug}`}
                      className="mt-3 border-t border-line pt-3"
                    >
                      <div className="flex items-center justify-between gap-2 px-1">
                        <p className="text-xs font-semibold text-ink-soft">{category.name}</p>
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setCategorySelection(subcategorySlugs, true)}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-pine hover:bg-card"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategorySelection(subcategorySlugs, false)}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-clay-dark hover:bg-card"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenSubcategoryMenu(null)}
                            className="rounded-md border border-line bg-card px-2 py-1 text-xs font-semibold text-ink-soft hover:border-clay/40"
                          >
                            Close
                          </button>
                        </span>
                      </div>
                      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                            {mappedSubcategories.map((subcategory) => (
                              <label
                                key={subcategory.slug}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-paper"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedSubcategories.has(subcategory.slug)}
                                    onChange={() => toggleSubcategory(subcategory.slug)}
                                    className="h-4 w-4 shrink-0 accent-pine"
                                  />
                                  <span className="truncate">{subcategory.name}</span>
                                </span>
                                <span className="shrink-0 text-xs text-ink-soft">
                                  {subcategory.count}
                                </span>
                              </label>
                            ))}
                          </div>
                    </div>
                  )}
                </div>
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
          <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper-2 shadow-sm">
            <LeafletVenueMap
              venues={visibleVenues}
              activeSlug={activeVenue?.slug ?? ""}
              userLocation={location}
              fitSignal={fitSignal}
              focusVenueSignal={focusVenueSignal}
              focusUserSignal={focusUserSignal}
              onSelectVenue={selectVenue}
            />
            {!visibleVenues.length && (
              <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center p-6 text-center">
                <div className="rounded-[var(--radius-card)] border border-line bg-card/95 p-6 text-ink-soft shadow-sm">
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
                    onClick={() => revealVenue(venue.slug)}
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
