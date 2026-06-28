import Link from "next/link";
import { categories } from "@/lib/taxonomy";
import { countsByCategory, topVenues } from "@/lib/venues";
import { CategoryCard } from "@/components/CategoryCard";
import { VenueCard } from "@/components/VenueCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [counts, featured] = await Promise.all([
    countsByCategory(),
    topVenues(8),
  ]);

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-marigold/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-pine/15 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
          <p className="font-display text-lg italic text-clay">Yaar, kya karein?</p>
          <h1 className="mt-2 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Everything to do in Karachi,
            <br />
            besides eating.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">
            Padel, cinemas, bowling, escape rooms, arcades, hikes, all sorted,
            rated and filtered. And when you really can&apos;t decide, just spin
            the wheel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/spin"
              className="rounded-full bg-clay px-6 py-3 font-semibold text-paper shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Can&apos;t decide? Spin 🎡
            </Link>
            <Link
              href="/c/sports-active/padel"
              className="rounded-full border border-line bg-card px-6 py-3 font-semibold text-ink transition-colors hover:border-clay/40"
            >
              Browse all
            </Link>
          </div>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="font-display text-2xl font-semibold text-ink">
          What are you in the mood for?
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <CategoryCard key={c.slug} category={c} count={counts[c.slug] ?? 0} />
          ))}
        </div>
      </section>

      {/* featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Crowd favourites
            </h2>
            <span className="text-sm text-ink-soft">highest rated right now</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((v) => (
              <VenueCard key={v.venue_id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
