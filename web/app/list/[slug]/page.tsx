import { notFound } from "next/navigation";
import { getCollection } from "@/lib/collections";
import { listAllVenues } from "@/lib/venues";
import { VenueCard } from "@/components/VenueCard";
import { Breadcrumb } from "@/components/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getCollection(slug);
  return { title: c ? c.title : "List" };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const venues = collection.pick(await listAllVenues());

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: collection.title }]} />

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl">{collection.emoji}</span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            {collection.title}
          </h1>
          <p className="text-ink-soft">{collection.blurb}</p>
        </div>
      </header>

      {venues.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {venues.map((v) => (
            <VenueCard key={v.venue_id} venue={v} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-ink-soft">Nothing here right now, check back soon.</p>
      )}
    </div>
  );
}
