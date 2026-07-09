import Link from "next/link";
import { notFound } from "next/navigation";
import { findSubcategory } from "@/lib/taxonomy";
import { listVenuesBySubcategory } from "@/lib/venues";
import { Breadcrumb } from "@/components/Breadcrumb";
import { isOpenNow } from "@/lib/hours";
import { subcategoryIcon } from "@/lib/icons";
import { SortableVenueGrid } from "@/components/SortableVenueGrid";

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
  searchParams: Promise<{ open?: string }>;
}) {
  const { category, subcategory } = await params;
  const { open } = await searchParams;
  const openActive = open === "1";
  const found = findSubcategory(subcategory);
  if (!found || found.category.slug !== category) notFound();
  const { category: cat, sub } = found;

  const venues = await listVenuesBySubcategory(subcategory);
  const filtered = openActive
    ? venues.filter((v) => isOpenNow(v.hours) === true)
    : venues;

  const base = `/c/${cat.slug}/${sub.slug}`;
  const href = (o?: boolean) => {
    const sp = new URLSearchParams();
    if (o) sp.set("open", "1");
    const s = sp.toString();
    return s ? `${base}?${s}` : base;
  };

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
            {venues.length === 0
              ? "Nothing here yet"
              : openActive
                ? `${filtered.length} of ${venues.length} ${venues.length === 1 ? "place" : "places"}`
                : `${venues.length} ${venues.length === 1 ? "place" : "places"} we found`}
          </p>
        </div>
      </header>

      {venues.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {/* open now toggle */}
          <Link
            href={href(!openActive)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              openActive
                ? "border-pine bg-pine text-paper"
                : "border-line bg-card text-pine hover:border-pine/40"
            }`}
          >
            ● Open now
          </Link>
        </div>
      )}

      {/* venue grid */}
      {filtered.length > 0 ? (
        <SortableVenueGrid venues={filtered} />
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
          Nothing open right now.{" "}
          <Link href={base} className="text-clay underline">
            Clear filters
          </Link>
        </p>
      )}
    </div>
  );
}
