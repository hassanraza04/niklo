"use client";

import { useMemo, useState } from "react";
import { sortVenuesForDisplay, type SortDirection, type SortMode } from "@/lib/geo";
import { useUserLocation } from "@/lib/useUserLocation";
import type { Venue } from "@/lib/types";
import { VenueCard } from "./VenueCard";

export function SortableVenueGrid({
  venues,
  className = "mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4",
}: {
  venues: Venue[];
  className?: string;
}) {
  const [sort, setSort] = useState<SortMode>("popularity");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const { location, status, requestLocation } = useUserLocation();

  const sorted = useMemo(
    () => sortVenuesForDisplay(venues, sort, direction, location),
    [venues, sort, direction, location],
  );

  function onSort(next: SortMode) {
    setSort(next);
    setDirection(next === "nearest" ? "asc" : "desc");
    if (next === "nearest" && !location) requestLocation();
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
      </div>

      <div className={className}>
        {sorted.map((venue) => (
          <VenueCard key={venue.venue_id} venue={venue} />
        ))}
      </div>
    </>
  );
}
