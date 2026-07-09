"use client";

import { useMemo, useState } from "react";
import { sortVenuesForDisplay, type SortDirection, type SortMode } from "@/lib/geo";
import { useUserLocation } from "@/lib/useUserLocation";
import {
  filterVenuesForDisplay,
  venueArea,
  type VenueFilters,
  type VenueMood,
} from "@/lib/venueFilters";
import type { Venue } from "@/lib/types";
import { VenueCard } from "./VenueCard";

function isString(value: string | null): value is string {
  return typeof value === "string";
}

export function SortableVenueGrid({
  venues,
  className = "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}: {
  venues: Venue[];
  className?: string;
}) {
  const [sort, setSort] = useState<SortMode>("popularity");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [area, setArea] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [mood, setMood] = useState<VenueMood>("any");
  const [minRating, setMinRating] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const { location, status, requestLocation } = useUserLocation();

  const areaOptions = useMemo(() => {
    return [...new Set(venues.map((venue) => venueArea(venue)).filter(isString))]
      .sort((a, b) => a.localeCompare(b));
  }, [venues]);

  const filters = useMemo<VenueFilters>(
    () => ({
      area: area || undefined,
      openNow,
      mood,
      minRating: minRating ? Number(minRating) : undefined,
      maxDistanceKm: maxDistance ? Number(maxDistance) : undefined,
    }),
    [area, openNow, mood, minRating, maxDistance],
  );

  const filtered = useMemo(
    () => filterVenuesForDisplay(venues, filters, location),
    [venues, filters, location],
  );

  const sorted = useMemo(
    () => sortVenuesForDisplay(filtered, sort, direction, location),
    [filtered, sort, direction, location],
  );

  function onSort(next: SortMode) {
    setSort(next);
    setDirection(next === "nearest" ? "asc" : "desc");
    if (next === "nearest" && !location) requestLocation();
  }

  function onDistance(next: string) {
    setMaxDistance(next);
    if (next && !location) requestLocation();
  }

  const directionLabels =
    sort === "nearest"
      ? { desc: "Farthest first", asc: "Nearest first" }
      : sort === "rating"
        ? { desc: "Highest first", asc: "Lowest first" }
        : { desc: "Most first", asc: "Least first" };

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-card p-3 text-sm">
        <label className="flex items-center gap-2 text-ink-soft">
          <input
            type="checkbox"
            checked={openNow}
            onChange={(event) => setOpenNow(event.target.checked)}
            className="h-4 w-4 accent-pine"
          />
          Open now
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Area
          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="">All</option>
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Mood
          <select
            value={mood}
            onChange={(event) => setMood(event.target.value as VenueMood)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="any">Any</option>
            <option value="active">Active</option>
            <option value="chill">Chill</option>
            <option value="family">Family</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="late">Late night</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Rated
          <select
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="">Any</option>
            <option value="4.0">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Within
          <select
            value={maxDistance}
            onChange={(event) => onDistance(event.target.value)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="">Any</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Sort
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as SortMode)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="popularity">Popularity</option>
            <option value="rating">Rating</option>
            <option value="nearest">Nearest</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          Order
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value as SortDirection)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value="desc">{directionLabels.desc}</option>
            <option value="asc">{directionLabels.asc}</option>
          </select>
        </label>
        {sort === "nearest" && !location && (
          <button
            type="button"
            onClick={requestLocation}
            disabled={status === "loading"}
            className="rounded-full bg-pine px-3.5 py-1.5 font-semibold text-paper disabled:opacity-60"
          >
            {status === "loading" ? "Finding you..." : "Use location"}
          </button>
        )}
        {sort === "nearest" && status === "denied" && (
          <span className="text-clay-dark">Location blocked</span>
        )}
        {sort === "nearest" && location && (
          <span className="text-pine">Sorting by distance</span>
        )}
        <span className="ml-auto text-ink-soft">
          {sorted.length} of {venues.length}
        </span>
      </div>

      {sorted.length > 0 ? (
        <div className={className}>
          {sorted.map((venue) => (
            <VenueCard key={venue.venue_id} venue={venue} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-8 text-center text-ink-soft">
          No places match these filters.
        </div>
      )}
    </>
  );
}
