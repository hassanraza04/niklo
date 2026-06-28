import Link from "next/link";
import { getVenuesBySlugs } from "@/lib/venues";
import { VenueCard } from "@/components/VenueCard";

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="font-display text-lg italic text-clay">Someone made a plan</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink sm:text-4xl">
        Where should we go tonight?
      </h1>
      <p className="mt-2 text-ink-soft">
        {venues.length} {venues.length === 1 ? "spot" : "spots"} on this shortlist. Pick one,
        or <Link href="/spin" className="text-clay underline">spin</Link> to decide.
      </p>

      {venues.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {venues.map((v) => (
            <VenueCard key={v.venue_id} venue={v} />
          ))}
        </div>
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
