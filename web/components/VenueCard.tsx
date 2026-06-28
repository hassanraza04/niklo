import Link from "next/link";
import { Rating } from "./Rating";
import type { Venue } from "@/lib/types";
import { canonicalArea } from "@/lib/areas";

export function VenueCard({ venue }: { venue: Venue }) {
  const area = canonicalArea(venue);
  return (
    <Link
      href={`/v/${venue.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
        {venue.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={venue.photo_url}
            alt={venue.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-clay/15 to-marigold/20">
            <span className="font-display text-4xl text-clay/50">
              {venue.name.charAt(0)}
            </span>
          </div>
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
        <div className="mt-auto pt-1">
          <Rating rating={venue.rating} reviewCount={venue.review_count} />
        </div>
      </div>
    </Link>
  );
}
