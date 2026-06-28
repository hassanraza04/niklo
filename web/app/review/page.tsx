import Link from "next/link";
import { listFlagged } from "@/lib/venues";
import { Rating } from "@/components/Rating";
import { canonicalArea } from "@/lib/areas";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };

function Row({ venue }: { venue: Venue }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link href={`/v/${venue.slug}`} className="font-display text-lg font-semibold text-ink hover:text-clay">
            {venue.name}
          </Link>
          <span className="text-sm text-ink-soft">
            {venue.google_category}
            {(() => {
              const a = canonicalArea(venue);
              return a ? ` · ${a}` : "";
            })()}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-clay-dark">⚠ {venue.review_flag}</p>
        <p className="mt-1 font-mono text-xs text-ink-soft/80 select-all">{venue.venue_id}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Rating rating={venue.rating} reviewCount={venue.review_count} />
        {venue.google_url && (
          <a
            href={venue.google_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink hover:border-clay/40"
          >
            Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}

export default async function ReviewPage() {
  const flagged = await listFlagged();
  const high = flagged.filter((v) => v.review_level === "high");
  const check = flagged.filter((v) => v.review_level === "check");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Review queue</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        {flagged.length}{" "}padel listings that might be bad imports from Maps (shops,
        other sports, generic clubs). Open each one, check if it&apos;s really a padel
        court, and remove the ones that aren&apos;t. The flags live in{" "}
        <code className="text-sm">data/padel_flags.csv</code>; re-apply with{" "}
        <code className="text-sm">infra/d1/flags.sql</code> after a re-seed.
      </p>
      <div className="mt-4 rounded-2xl border border-line bg-paper-2 p-4 text-sm text-ink-soft">
        Remove confirmed bad ones by venue_id, e.g.
        <pre className="mt-2 overflow-x-auto rounded-lg bg-card p-3 text-xs text-ink">
{`wrangler d1 execute niklo --local --command \\
  "DELETE FROM venues WHERE venue_id IN ('PLACE_ID_1','PLACE_ID_2')"`}
        </pre>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Probably not padel courts{" "}
          <span className="text-base font-normal text-ink-soft">({high.length})</span>
        </h2>
        <p className="text-sm text-ink-soft">stores, suppliers, other sports, venues with no padel signal</p>
        <div className="mt-4 space-y-2">
          {high.map((v) => (
            <Row key={v.venue_id} venue={v} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">
          Worth a check{" "}
          <span className="text-base font-normal text-ink-soft">({check.length})</span>
        </h2>
        <p className="text-sm text-ink-soft">general sports clubs/complexes that may or may not have padel</p>
        <div className="mt-4 space-y-2">
          {check.map((v) => (
            <Row key={v.venue_id} venue={v} />
          ))}
        </div>
      </section>
    </div>
  );
}
