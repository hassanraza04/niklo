import Link from "next/link";
import { categories } from "@/lib/taxonomy";
import { countsByCategory, listFinderVenues, topVenues } from "@/lib/venues";
import { CategoryCard } from "@/components/CategoryCard";
import { VenueCard } from "@/components/VenueCard";
import { collections } from "@/lib/collections";
import { TonightFinder } from "@/components/TonightFinder";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

function heroVenuePhotos(venues: Venue[]): Venue[] {
  const wanted = [
    "padel",
    "cinemas",
    "bowling",
    "arcades",
    "parks",
    "museums-galleries",
    "paintball",
    "music-rooms",
  ];
  const seen = new Set<string>();
  const picked: Venue[] = [];
  for (const slug of wanted) {
    const venue = venues.find(
      (venue) =>
        venue.photo_url &&
        !seen.has(venue.venue_id) &&
        (venue.subcategories ?? venue.subcategory_slug).split(",").includes(slug),
    );
    if (venue) {
      seen.add(venue.venue_id);
      picked.push(venue);
    }
    if (picked.length === 4) break;
  }
  return picked;
}

export default async function Home() {
  const [counts, featured, allVenues] = await Promise.all([
    countsByCategory(),
    topVenues(8),
    listFinderVenues(),
  ]);
  const heroPhotos = heroVenuePhotos(allVenues);

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line bg-ink">
        <div className="absolute inset-0 grid grid-cols-2 gap-1 opacity-45 sm:grid-cols-4">
          {heroPhotos.map((venue) => (
            <div key={venue.venue_id} className="relative min-h-40 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={venue.photo_url ?? ""}
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/90 to-paper/55" />
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <p className="font-display text-lg italic text-clay">Yaar, kya karein?</p>
          <h1 className="mt-2 max-w-3xl text-balance font-display text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
            Everything to do in Karachi,
            <br />
            besides eating.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Padel, cinemas, bowling, escape rooms, arcades, hikes, all sorted,
            rated and filtered. And when you really can&apos;t decide, just spin
            the wheel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/spin"
              className="rounded-full bg-clay px-6 py-3 font-semibold text-paper shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
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

      <TonightFinder venues={allVenues} />

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

      {/* collections */}
      <section className="mx-auto max-w-6xl px-5 pb-2">
        <h2 className="font-display text-2xl font-semibold text-ink">Niklo picks</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.slug}
              href={`/list/${c.slug}`}
              className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-clay/40 hover:shadow-md"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span>
                <span className="block font-display text-lg font-semibold text-ink">
                  {c.title}
                </span>
                <span className="block text-sm text-ink-soft">{c.blurb}</span>
              </span>
            </Link>
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((v) => (
              <VenueCard key={v.venue_id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
