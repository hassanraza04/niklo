import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueBySlug, listVenuesBySubcategory } from "@/lib/venues";
import { parsePhotos } from "@/lib/types";
import { findSubcategory } from "@/lib/taxonomy";
import { canonicalArea } from "@/lib/areas";
import { Rating } from "@/components/Rating";
import { Breadcrumb } from "@/components/Breadcrumb";
import { OpenHours } from "@/components/OpenHours";
import { VenueMap } from "@/components/VenueMap";
import { VenueCard } from "@/components/VenueCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = await getVenueBySlug(slug);
  return { title: v ? v.name : "Venue" };
}

function verifiedOn(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = await getVenueBySlug(slug);
  if (!venue) notFound();

  const found = venue.subcategory_slug ? findSubcategory(venue.subcategory_slug) : null;
  const area = canonicalArea(venue);
  const photos = parsePhotos(venue.photos);
  const gallery = photos.length ? photos.slice(0, 5) : venue.photo_url ? [venue.photo_url] : [];
  const verified = verifiedOn(venue.last_verified);

  const similar = (await listVenuesBySubcategory(venue.subcategory_slug))
    .filter((v) => v.venue_id !== venue.venue_id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          ...(found
            ? [
                { label: found.category.name, href: `/c/${found.category.slug}` },
                {
                  label: found.sub.name,
                  href: `/c/${found.category.slug}/${found.sub.slug}`,
                },
              ]
            : []),
          { label: venue.name },
        ]}
      />

      {/* gallery */}
      {gallery.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2 overflow-hidden rounded-[var(--radius-card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gallery[0]}
            alt={venue.name}
            className="col-span-4 h-64 w-full object-cover sm:col-span-2 sm:h-80"
          />
          {gallery.slice(1, 5).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="hidden h-[9.5rem] w-full object-cover sm:block"
            />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* main column */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {found && (
              <span className="rounded-full bg-pine/10 px-2.5 py-0.5 text-sm font-medium text-pine">
                {found.sub.name}
              </span>
            )}
            {venue.is_open === 0 && (
              <span className="rounded-full bg-ink/80 px-2.5 py-0.5 text-sm font-medium text-paper">
                Permanently closed
              </span>
            )}
          </div>

          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-ink">
            {venue.name}
          </h1>
          <p className="mt-1 text-ink-soft">{area ?? venue.area ?? "Karachi"}</p>

          <div className="mt-3">
            <Rating rating={venue.rating} reviewCount={venue.review_count} size="lg" />
          </div>

          {venue.address && (
            <p className="mt-6 max-w-prose text-ink-soft">{venue.address}</p>
          )}

          {/* contact row */}
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            {venue.phone && (
              <a
                href={`tel:${venue.phone.replace(/\s+/g, "")}`}
                className="rounded-full border border-line bg-card px-4 py-2 font-medium text-ink hover:border-clay/40"
              >
                📞 {venue.phone}
              </a>
            )}
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line bg-card px-4 py-2 font-medium text-ink hover:border-clay/40"
              >
                🌐 Website
              </a>
            )}
          </div>

          {/* map */}
          {venue.latitude != null && venue.longitude != null && (
            <div className="mt-8">
              <VenueMap lat={venue.latitude} lon={venue.longitude} name={venue.name} />
            </div>
          )}
        </div>

        {/* sidebar */}
        <aside className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-line bg-card p-5">
            {venue.google_url && (
              <a
                href={venue.google_url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-full bg-clay px-4 py-2.5 text-center font-semibold text-paper transition-transform hover:-translate-y-0.5"
              >
                View on Google Maps →
              </a>
            )}

            {parseHasHours(venue.hours) && (
              <div className="mt-5">
                <h2 className="mb-2 font-display text-lg font-semibold text-ink">
                  Opening hours
                </h2>
                <OpenHours raw={venue.hours} />
              </div>
            )}
          </div>

          {verified && (
            <p className="px-1 text-xs text-ink-soft">
              ✓ Last verified {verified} · from public Google Maps data
            </p>
          )}
        </aside>
      </div>

      {/* similar */}
      {similar.length > 0 && found && (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-semibold text-ink">
            More {found.sub.name.toLowerCase()} nearby
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {similar.map((v) => (
              <VenueCard key={v.venue_id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function parseHasHours(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const h = JSON.parse(raw);
    return h && Object.keys(h).length > 0;
  } catch {
    return false;
  }
}
