"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearClientCatalogCache,
  loadClientCatalog,
} from "@/lib/clientCatalog";
import type { CatalogCardVenue } from "@/lib/types";

export function useClientCatalog() {
  const [venues, setVenues] = useState<readonly CatalogCardVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    loadClientCatalog()
      .then((catalog) => {
        if (!active) return;
        setVenues(catalog);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    clearClientCatalogCache();
    setError(null);
    setLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  return { venues, loading, error, retry };
}

export function CatalogLoading({ className = "" }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading places"
      className={`min-h-64 animate-pulse rounded-[var(--radius-card)] bg-paper-2 ${className}`}
    />
  );
}

export function CatalogError({
  retry,
  className = "",
}: {
  retry: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex min-h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-line bg-card p-8 text-center ${className}`}
    >
      <p className="text-ink-soft">Could not load places. Please refresh and try again.</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
      >
        Retry
      </button>
    </div>
  );
}
