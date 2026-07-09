"use client";

import { formatDistance, venueDistanceKm } from "@/lib/geo";
import { useUserLocation } from "@/lib/useUserLocation";

export function VenueDistance({
  lat,
  lon,
  prompt = false,
  className = "",
}: {
  lat: number | null;
  lon: number | null;
  prompt?: boolean;
  className?: string;
}) {
  const { location, status, requestLocation } = useUserLocation();
  const km = venueDistanceKm(
    { latitude: lat, longitude: lon, rating: null, review_count: null },
    location,
  );

  if (km != null) {
    if (!prompt) {
      return <span className={className}>{formatDistance(km)} away</span>;
    }

    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className={className}>{formatDistance(km)} away</span>
        <button
          type="button"
          onClick={requestLocation}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink hover:border-clay/40"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Updating..." : "Update location"}
        </button>
      </span>
    );
  }

  if (!prompt) return null;

  if (status === "denied") {
    return <span className={className}>Location blocked</span>;
  }

  if (status === "unsupported") {
    return <span className={className}>Location unavailable</span>;
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      className={`rounded-full border border-line bg-card px-4 py-2 font-medium text-ink hover:border-clay/40 ${className}`}
      disabled={status === "loading"}
    >
      {status === "loading" ? "Finding you..." : "Use location"}
    </button>
  );
}
