"use client";

import { useMemo, useState } from "react";
import type { Venue } from "@/lib/types";
import {
  distanceReferenceCoordinates,
  distanceReferenceName,
  LANDMARK_REFERENCES,
  USER_LOCATION_REFERENCE_ID,
} from "@/lib/locationReference";
import { useUserLocation } from "@/lib/useUserLocation";
import { tonightPickPage, type VenueFilters } from "@/lib/venueFilters";
import { VenueCard } from "./VenueCard";

export function TonightFinder({ venues }: { venues: Venue[] }) {
  const [openNow, setOpenNow] = useState(false);
  const [maxDistance, setMaxDistance] = useState("");
  const [distanceReference, setDistanceReference] = useState(USER_LOCATION_REFERENCE_ID);
  const [page, setPage] = useState(0);
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
      minRating: 4.2,
      maxDistanceKm: maxDistance ? Number(maxDistance) : undefined,
    }),
    [openNow, maxDistance],
  );

  const resultPage = useMemo(
    () => tonightPickPage(venues, filters, distanceCenter, page),
    [venues, filters, distanceCenter, page],
  );

  function onDistance(next: string) {
    setMaxDistance(next);
    setPage(0);
    if (next && needsUserLocation) requestLocation();
  }

  function onDistanceReference(next: string) {
    setDistanceReference(next);
    setPage(0);
    if (next === USER_LOCATION_REFERENCE_ID && !location && maxDistance) {
      requestLocation();
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-sm">
        <div>
          <p className="font-display text-lg italic text-clay">Tonight</p>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Find something that fits
          </h2>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-ink-soft">
              <input
                type="checkbox"
                checked={openNow}
                onChange={(event) => {
                  setOpenNow(event.target.checked);
                  setPage(0);
                }}
                className="h-4 w-4 accent-pine"
              />
              Open now
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
          {maxDistance && needsUserLocation && (
            <button
              type="button"
              onClick={requestLocation}
              disabled={status === "loading"}
              className="rounded-full bg-pine px-3.5 py-1.5 font-semibold text-paper disabled:opacity-60"
            >
              {status === "loading" ? "Finding you..." : "Use location"}
            </button>
          )}
          {maxDistance && distanceReference === USER_LOCATION_REFERENCE_ID && location && (
            <button
              type="button"
              onClick={requestLocation}
              disabled={status === "loading"}
              className="rounded-full border border-line bg-paper px-3.5 py-1.5 font-semibold text-ink disabled:opacity-60"
            >
              {status === "loading" ? "Updating..." : "Update location"}
            </button>
          )}
          {maxDistance && distanceCenter && (
            <span className="text-pine">
              Distance from {distanceReferenceName(distanceReference)}
            </span>
          )}
        </div>

        {status === "denied" && maxDistance && (
          <p className="mt-3 text-sm text-clay-dark">Location blocked</p>
        )}

        {resultPage.picks.length > 0 ? (
          <>
            <div className="mt-5 flex items-center justify-between gap-3 text-sm text-ink-soft">
              <span>
                {resultPage.currentPage * 5 + 1}-
                {resultPage.currentPage * 5 + resultPage.picks.length} of {resultPage.totalMatches}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(resultPage.currentPage - 1)}
                  disabled={resultPage.currentPage === 0}
                  className="rounded-full border border-line bg-paper px-3 py-1.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(resultPage.currentPage + 1)}
                  disabled={resultPage.currentPage >= resultPage.pageCount - 1}
                  className="rounded-full border border-line bg-paper px-3 py-1.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
              {resultPage.picks.map((venue) => (
                <VenueCard key={venue.venue_id} venue={venue} distanceFrom={distanceCenter} />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-8 text-center text-ink-soft">
            No places match these choices.
          </div>
        )}
      </div>
    </section>
  );
}
