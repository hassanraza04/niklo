import Link from "next/link";
import { searchVenues } from "@/lib/venues";
import { VenueCard } from "@/components/VenueCard";
import { SearchBox } from "@/components/SearchBox";
import { Breadcrumb } from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? await searchVenues(query) : [];

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

      {query && (
        <p className="mt-4 text-ink-soft">
          {results.length} {results.length === 1 ? "place" : "places"} found
        </p>
      )}

      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {results.map((v) => (
            <VenueCard key={v.venue_id} venue={v} />
          ))}
        </div>
      ) : query ? (
        <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">No matches for &ldquo;{query}&rdquo;</p>
          <p className="mt-2 text-ink-soft">
            Try a venue name, an area like Clifton or DHA, or a category like padel.
          </p>
          <Link
            href="/c/sports-active/padel"
            className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
          >
            Browse padel instead
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-ink-soft">
          Search by venue name, area (Clifton, DHA, Gulshan…), or category.
        </p>
      )}
    </div>
  );
}
