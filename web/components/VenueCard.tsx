import Link from "next/link";
import { Rating } from "./Rating";
import type { Venue } from "@/lib/types";
import { canonicalArea } from "@/lib/areas";
import { isOpenNow } from "@/lib/hours";

export function VenueCard({ venue }: { venue: Venue }) {
  const area = canonicalArea(venue);
  const open = isOpenNow(venue.hours);
  return (
    <Link
      href={`/v/${venue.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
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

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-clay">
            {venue.name}
          </h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            {venue.subcategory_name}
            {area && <span> · {area}</span>}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Rating rating={venue.rating} reviewCount={venue.review_count} />
          {open === true && (
            <span className="shrink-0 text-xs font-semibold text-pine">● Open</span>
          )}
          {open === false && (
            <span className="shrink-0 text-xs text-ink-soft">Closed now</span>
          )}
        </div>
      </div>
    </Link>
  );
}
