import Link from "next/link";
import { Rating } from "./Rating";
import type { Coordinates } from "@/lib/geo";
import type { CatalogCardVenue } from "@/lib/types";
import { canonicalArea } from "@/lib/areas";
import { isOpenNow } from "@/lib/hours";
import { VenueDistance } from "./VenueDistance";
import { SaveButton } from "./SaveButton";

export function VenueCard({
  venue,
  distanceFrom,
}: {
  venue: CatalogCardVenue;
  distanceFrom?: Coordinates | null;
}) {
  const area = canonicalArea(venue);
  const open = isOpenNow(venue.hours);
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:translate-y-0">
      <Link href={`/v/${venue.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-paper-2 sm:aspect-[4/3]">
          {/* gradient + initial sit behind, so the card never flashes blank while
              the photo lazy-loads, and shows through if a photo is missing */}
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-clay/15 to-marigold/20"
          >
            <span className="font-display text-4xl text-clay/50">
              {venue.name.charAt(0)}
            </span>
          </div>
          {venue.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.photo_url}
              alt={venue.name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}
          {venue.is_open === 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-medium text-paper">
              Closed
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/v/${venue.slug}`} className="min-w-0 flex-1">
            <h3 className="break-words font-display text-base font-semibold leading-snug text-ink group-hover:text-clay sm:text-lg">
              {venue.name}
            </h3>
            <p className="mt-0.5 break-words text-sm text-ink-soft">
              {venue.subcategory_name}
              {area && <span> · {area}</span>}
            </p>
            <VenueDistance
              lat={venue.latitude}
              lon={venue.longitude}
              referenceLocation={distanceFrom}
              className="mt-1 block text-xs font-medium text-pine"
            />
          </Link>
          <SaveButton
            item={{
              slug: venue.slug,
              name: venue.name,
              sub: venue.subcategory_name,
              area,
              rating: venue.rating,
              reviews: venue.review_count,
              photo: venue.photo_url,
              latitude: venue.latitude,
              longitude: venue.longitude,
            }}
            variant="icon"
          />
        </div>
        <Link
          href={`/v/${venue.slug}`}
          className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1"
        >
          <Rating rating={venue.rating} reviewCount={venue.review_count} />
          {open === true && (
            <span className="shrink-0 text-xs font-semibold text-pine">● Open</span>
          )}
          {open === false && (
            <span className="shrink-0 text-xs text-ink-soft">Closed now</span>
          )}
        </Link>
      </div>
    </article>
  );
}
