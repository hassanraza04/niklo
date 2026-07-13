"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { canonicalArea } from "@/lib/areas";
import type { SavedItem } from "@/lib/saved";
import { findSubcategory } from "@/lib/taxonomy";
import { AddAllButton } from "./AddAllButton";
import { CatalogError, CatalogLoading, useClientCatalog } from "./CatalogLoader";
import { SpinWheel } from "./SpinWheel";
import { VenueCard } from "./VenueCard";

function PlanResultsContent() {
  const searchParams = useSearchParams();
  const rawSlugs = searchParams.get("v") ?? "";
  const slugs = useMemo(
    () => rawSlugs.split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, 50),
    [rawSlugs],
  );
  const { venues: catalog, loading, error, retry } = useClientCatalog();
  const venues = useMemo(() => {
    const bySlug = new Map(catalog.map((venue) => [venue.slug, venue]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((venue) => venue != null);
  }, [catalog, slugs]);

  const segments = venues.map((venue) => ({
    label: venue.name,
    href: `/v/${venue.slug}`,
    tag: canonicalArea(venue),
  }));
  const asSaved: SavedItem[] = venues.map((venue) => ({
    slug: venue.slug,
    name: venue.name,
    sub: venue.subcategory_slug
      ? (findSubcategory(venue.subcategory_slug)?.sub.name ?? null)
      : null,
    area: canonicalArea(venue) ?? venue.area,
    rating: venue.rating,
    reviews: venue.review_count,
    photo: venue.photo_url,
    latitude: venue.latitude,
    longitude: venue.longitude,
  }));

  if (loading) {
    return <CatalogLoading className="mx-auto mt-10 max-w-6xl" />;
  }
  if (error) {
    return <CatalogError retry={retry} className="mx-auto mt-10 max-w-6xl" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="font-display text-lg italic text-clay">Someone made a plan</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Where should we go tonight?
      </h1>
      <p className="mt-2 text-ink-soft">
        {venues.length} {venues.length === 1 ? "spot" : "spots"} on this shortlist.
        {venues.length >= 2 ? " Can't agree? Let the wheel settle it." : ""}
      </p>

      {venues.length > 0 ? (
        <>
          {venues.length >= 2 && (
            <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-card px-5 py-8">
              <h2 className="text-center font-display text-2xl font-semibold text-ink">
                Spin the shortlist
              </h2>
              {venues.length > 10 && (
                <p className="mt-1 text-center text-sm text-ink-soft">
                  Showing the first 10 on the wheel.
                </p>
              )}
              <div className="mt-6">
                <SpinWheel segments={segments} />
              </div>
            </section>
          )}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Everything on the list
            </h2>
            <AddAllButton items={asSaved} />
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {venues.map((venue, index) => (
              <VenueCard key={`${venue.venue_id}-${index}`} venue={venue} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">This plan is empty</p>
          <p className="mt-2 text-ink-soft">
            The link might be broken. Start your own list instead.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
          >
            Browse Niklo
          </Link>
        </div>
      )}
    </div>
  );
}

export function PlanResults() {
  return (
    <Suspense fallback={<CatalogLoading className="mx-auto mt-10 max-w-6xl" />}>
      <PlanResultsContent />
    </Suspense>
  );
}
