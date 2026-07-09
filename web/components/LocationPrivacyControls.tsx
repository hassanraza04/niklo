"use client";

import { useUserLocation } from "@/lib/useUserLocation";

const LOCATION_PROMPT_SESSION_KEY = "niklo:location-boot-prompted";

function formatUpdatedAt(value: number | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function LocationPrivacyControls() {
  const { location, updatedAt, status, requestLocation, clearLocation } = useUserLocation();
  const lastUpdated = formatUpdatedAt(updatedAt);

  function clearWithoutReprompting() {
    try {
      sessionStorage.setItem(LOCATION_PROMPT_SESSION_KEY, "1");
    } catch {
      // Ignore private-mode storage failures.
    }
    clearLocation();
  }

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-card p-5">
      <h2 className="font-display text-2xl font-semibold text-ink">Location controls</h2>
      {location ? (
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Location is saved in this browser. It expires after 24 hours.
          {lastUpdated ? ` Last updated ${lastUpdated}.` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          No location is saved in this browser right now.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-paper transition hover:bg-pine-dark disabled:opacity-60"
          type="button"
          onClick={requestLocation}
          disabled={status === "loading"}
        >
          {status === "loading"
            ? location
              ? "Updating..."
              : "Finding you..."
            : location
              ? "Update location"
              : "Use location"}
        </button>
        {location && (
          <button
            className="rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:border-clay hover:text-clay"
            type="button"
            onClick={clearWithoutReprompting}
          >
            Clear location
          </button>
        )}
      </div>
      {status === "denied" && (
        <p className="mt-3 text-sm text-clay-dark">
          Location is blocked in your browser settings.
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-3 text-sm text-clay-dark">
          This browser does not support location access.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-clay-dark">
          We could not get your location. Please try again.
        </p>
      )}
    </section>
  );
}
