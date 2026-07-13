"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { searchClientCatalog } from "@/lib/clientCatalog";
import type { Venue } from "@/lib/types";
import { Breadcrumb } from "./Breadcrumb";
import { CatalogError, CatalogLoading, useClientCatalog } from "./CatalogLoader";
import { SearchBox } from "./SearchBox";
import { SortableVenueGrid } from "./SortableVenueGrid";
import { BrowseLink } from "./BrowseLink";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const { venues, loading, error, retry } = useClientCatalog();
  const results = useMemo(
    () => (query ? searchClientCatalog(query, venues) : []),
    [query, venues],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: query ? `Search: ${query}` : "Search" },
        ]}
      />

      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
        {query ? (
          <>
            Results for <span className="text-clay">&ldquo;{query}&rdquo;</span>
          </>
        ) : (
          "Search Niklo"
        )}
      </h1>

      <div className="mt-4 max-w-xl">
        <SearchBox size="lg" defaultValue={query} autoFocus={!query} />
      </div>

      {loading ? (
        <CatalogLoading className="mt-6" />
      ) : error ? (
        <CatalogError retry={retry} className="mt-6" />
      ) : (
        <>
          {query && (
            <p className="mt-4 text-ink-soft">
              {results.length} {results.length === 1 ? "place" : "places"} found
            </p>
          )}

          {results.length > 0 ? (
            <SortableVenueGrid
              venues={results as Venue[]}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            />
          ) : query ? (
            <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
              <p className="font-display text-xl text-ink">
                No matches for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-2 text-ink-soft">
                Try a venue name, an area like Clifton or DHA, or browse by type.
              </p>
              <BrowseLink
                className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
              >
                Browse all types
              </BrowseLink>
            </div>
          ) : (
            <p className="mt-6 text-ink-soft">
              Search by venue name, area (Clifton, DHA, Gulshan…), or category.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function SearchResults() {
  return (
    <Suspense fallback={<CatalogLoading className="mx-auto mt-8 max-w-6xl" />}>
      <SearchResultsContent />
    </Suspense>
  );
}
