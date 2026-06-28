import Link from "next/link";
import { notFound } from "next/navigation";
import { findSubcategory } from "@/lib/taxonomy";
import { listVenuesBySubcategory } from "@/lib/venues";
import { VenueCard } from "@/components/VenueCard";
import { Breadcrumb } from "@/components/Breadcrumb";
import { canonicalArea } from "@/lib/areas";
import { subcategoryIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { subcategory } = await params;
  const found = findSubcategory(subcategory);
  return { title: found ? `${found.sub.name} in Karachi` : "Browse" };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { category, subcategory } = await params;
  const { area: activeArea } = await searchParams;
  const found = findSubcategory(subcategory);
  if (!found || found.category.slug !== category) notFound();
  const { category: cat, sub } = found;

  const venues = await listVenuesBySubcategory(subcategory);

  // build area facets from the messy scraped text
  const areaCounts = new Map<string, number>();
  for (const v of venues) {
    const a = canonicalArea(v);
    if (a) areaCounts.set(a, (areaCounts.get(a) ?? 0) + 1);
  }
  const areas = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]);
  const filtered = activeArea
    ? venues.filter((v) => canonicalArea(v) === activeArea)
    : venues;

  const base = `/c/${cat.slug}/${sub.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: cat.name, href: `/c/${cat.slug}` },
          { label: sub.name },
        ]}
      />

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl">{subcategoryIcon(sub.slug, cat.slug)}</span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            {sub.name} in Karachi
          </h1>
          <p className="text-ink-soft">
            {venues.length > 0
              ? `${venues.length} ${venues.length === 1 ? "place" : "places"} we found`
              : "Nothing here yet"}
          </p>
        </div>
      </header>

      {/* area chips */}
      {areas.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={base}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              !activeArea
                ? "border-clay bg-clay text-paper"
                : "border-line bg-card text-ink-soft hover:border-clay/40 hover:text-ink"
            }`}
          >
            All areas
          </Link>
          {areas.map(([area, n]) => (
            <Link
              key={area}
              href={`${base}?area=${encodeURIComponent(area)}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeArea === area
                  ? "border-clay bg-clay text-paper"
                  : "border-line bg-card text-ink-soft hover:border-clay/40 hover:text-ink"
              }`}
            >
              {area} <span className="opacity-60">{n}</span>
            </Link>
          ))}
        </div>
      )}

      {/* venue grid */}
      {filtered.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((v) => (
            <VenueCard key={v.venue_id} venue={v} />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">
            We haven&apos;t mapped {sub.name.toLowerCase()} yet
          </p>
          <p className="mt-2 text-ink-soft">
            It&apos;s on the list. Padel is fully loaded if you want to start there.
          </p>
          <Link
            href="/c/sports-active/padel"
            className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
          >
            See padel courts
          </Link>
        </div>
      ) : (
        <p className="mt-10 text-ink-soft">
          Nothing in {activeArea}.{" "}
          <Link href={base} className="text-clay underline">
            Show all areas
          </Link>
        </p>
      )}
    </div>
  );
}
