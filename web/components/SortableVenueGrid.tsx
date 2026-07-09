"use client";

import { useMemo, useState } from "react";
import { sortVenuesForDisplay, type SortDirection, type SortMode } from "@/lib/geo";
import {
  distanceReferenceCoordinates,
  distanceReferenceName,
  LANDMARK_REFERENCES,
  USER_LOCATION_REFERENCE_ID,
} from "@/lib/locationReference";
import { useUserLocation } from "@/lib/useUserLocation";
import { filterVenuesForDisplay, type VenueFilters } from "@/lib/venueFilters";
import type { Venue } from "@/lib/types";
import { VenueCard } from "./VenueCard";

export function SortableVenueGrid({
  venues,
  className = "mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
}: {
  venues: Venue[];
  className?: string;
}) {
  const [sort, setSort] = useState<SortMode>("popularity");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [openNow, setOpenNow] = useState(false);
  const [minRating, setMinRating] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [distanceReference, setDistanceReference] = useState(USER_LOCATION_REFERENCE_ID);
  const { location, status, requestLocation } = useUserLocation();

  const distanceCenter = useMemo(
    () => distanceReferenceCoordinates(distanceReference, location),
    [distanceReference, location],
  );
  const needsUserLocation =
    distanceReference === USER_LOCATION_REFERENCE_ID && !location;

  const filters = useMemo<VenueFilters>(
    () => ({
      openNow,
      minRating: minRating ? Number(minRating) : undefined,
      maxDistanceKm: maxDistance ? Number(maxDistance) : undefined,
    }),
    [openNow, minRating, maxDistance],
  );

  const filtered = useMemo(
    () => filterVenuesForDisplay(venues, filters, distanceCenter),
    [venues, filters, distanceCenter],
  );

  const sorted = useMemo(
    () => sortVenuesForDisplay(filtered, sort, direction, distanceCenter),
    [filtered, sort, direction, distanceCenter],
  );

  function onSort(next: SortMode) {
    setSort(next);
    setDirection(next === "nearest" ? "asc" : "desc");
    if (next === "nearest" && needsUserLocation) requestLocation();
  }

  function onDistance(next: string) {
    setMaxDistance(next);
    if (next && needsUserLocation) requestLocation();
  }

  function onDistanceReference(next: string) {
    setDistanceReference(next);
    if (next === USER_LOCATION_REFERENCE_ID && !location && (maxDistance || sort === "nearest")) {
      requestLocation();
    }
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
          <input
            type="number"
            value={maxDistance}
            onChange={(event) => onDistance(event.target.value)}
            min="1"
            max="80"
            step="1"
            placeholder="Any"
            className="w-20 rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          />
          km
        </label>
        <label className="flex items-center gap-2 text-ink-soft">
          From
          <select
            value={distanceReference}
            onChange={(event) => onDistanceReference(event.target.value)}
            className="rounded-full border border-line bg-paper px-3 py-1.5 font-medium text-ink outline-none focus:border-clay/50"
          >
            <option value={USER_LOCATION_REFERENCE_ID}>My location</option>
            {LANDMARK_REFERENCES.map((reference) => (
              <option key={reference.id} value={reference.id}>
                {reference.name}
              </option>
            ))}
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
        {(sort === "nearest" || maxDistance) && needsUserLocation && (
          <button
            type="button"
            onClick={requestLocation}
            disabled={status === "loading"}
            className="rounded-full bg-pine px-3.5 py-1.5 font-semibold text-paper disabled:opacity-60"
          >
            {status === "loading" ? "Finding you..." : "Use location"}
          </button>
        )}
        {(sort === "nearest" || maxDistance) &&
          distanceReference === USER_LOCATION_REFERENCE_ID &&
          location && (
          <button
            type="button"
            onClick={requestLocation}
            disabled={status === "loading"}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 font-semibold text-ink disabled:opacity-60"
          >
            {status === "loading" ? "Updating..." : "Update location"}
          </button>
        )}
        {(sort === "nearest" || maxDistance) && needsUserLocation && status === "denied" && (
          <span className="text-clay-dark">Location blocked</span>
        )}
        {(sort === "nearest" || maxDistance) && distanceCenter && (
          <span className="text-pine">Distance from {distanceReferenceName(distanceReference)}</span>
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
