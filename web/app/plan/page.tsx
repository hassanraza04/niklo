import Link from "next/link";
import { getVenuesBySlugs } from "@/lib/venues";
import { canonicalArea } from "@/lib/areas";
import { findSubcategory } from "@/lib/taxonomy";
import { VenueCard } from "@/components/VenueCard";
import { SpinWheel } from "@/components/SpinWheel";
import { AddAllButton } from "@/components/AddAllButton";
import type { SavedItem } from "@/lib/saved";

export const dynamic = "force-dynamic";
export const metadata = { title: "A plan for tonight" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const slugs = (v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const venues = await getVenuesBySlugs(slugs);

  const segments = venues.map((vn) => ({
    name: vn.name,
    slug: vn.slug,
    area: canonicalArea(vn),
  }));

  // shape the plan so a friend can pull it onto their own saved list
  const asSaved: SavedItem[] = venues.map((vn) => ({
    slug: vn.slug,
    name: vn.name,
    sub: vn.subcategory_slug ? (findSubcategory(vn.subcategory_slug)?.sub.name ?? null) : null,
    area: canonicalArea(vn) ?? vn.area,
    rating: vn.rating,
    reviews: vn.review_count,
    photo: vn.photo_url,
  }));

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
            <h2 className="font-display text-2xl font-semibold text-ink">Everything on the list</h2>
            <AddAllButton items={asSaved} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {venues.map((vn) => (
              <VenueCard key={vn.venue_id} venue={vn} />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">This plan is empty</p>
          <p className="mt-2 text-ink-soft">The link might be broken. Start your own list instead.</p>
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
