"use client";

import { useMemo, useState } from "react";
import type { Venue } from "@/lib/types";
import { useUserLocation } from "@/lib/useUserLocation";
import {
  tonightPicks,
  venueArea,
  type VenueFilters,
  type VenueMood,
} from "@/lib/venueFilters";
import { VenueCard } from "./VenueCard";

function isString(value: string | null): value is string {
  return typeof value === "string";
}

export function TonightFinder({ venues }: { venues: Venue[] }) {
  const [mood, setMood] = useState<VenueMood>("any");
  const [area, setArea] = useState("");
  const [openNow, setOpenNow] = useState(false);
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
      minRating: 4.2,
      maxDistanceKm: maxDistance ? Number(maxDistance) : undefined,
    }),
    [area, openNow, mood, maxDistance],
  );

  const picks = useMemo(
    () => tonightPicks(venues, filters, location, 5),
    [venues, filters, location],
  );

  function onDistance(next: string) {
    setMaxDistance(next);
    if (next && !location) requestLocation();
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-lg italic text-clay">Tonight</p>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Find something that fits
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
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
            {maxDistance && !location && (
              <button
                type="button"
                onClick={requestLocation}
                disabled={status === "loading"}
                className="rounded-full bg-pine px-3.5 py-1.5 font-semibold text-paper disabled:opacity-60"
              >
                {status === "loading" ? "Finding you..." : "Use location"}
              </button>
            )}
          </div>
        </div>

        {status === "denied" && maxDistance && (
          <p className="mt-3 text-sm text-clay-dark">Location blocked</p>
        )}

        {picks.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
            {picks.map((venue) => (
              <VenueCard key={venue.venue_id} venue={venue} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-8 text-center text-ink-soft">
            No places match these choices.
          </div>
        )}
      </div>
    </section>
  );
}
