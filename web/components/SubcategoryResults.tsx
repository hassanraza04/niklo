"use client";

import { useState } from "react";
import type { Venue } from "@/lib/types";
import { isOpenNow } from "@/lib/hours";
import { SortableVenueGrid } from "./SortableVenueGrid";

export function SubcategoryResults({ venues }: { venues: Venue[] }) {
  const [openOnly, setOpenOnly] = useState(false);
  const shown = openOnly
    ? venues.filter((venue) => isOpenNow(venue.hours) === true)
    : venues;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpenOnly((value) => !value)}
          aria-pressed={openOnly}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            openOnly
              ? "border-pine bg-pine text-paper"
              : "border-line bg-card text-pine hover:border-pine/40"
          }`}
        >
          ● Open now
        </button>
      </div>

      {shown.length > 0 ? (
        <SortableVenueGrid venues={shown} />
      ) : (
        <p className="mt-10 text-ink-soft">
          Nothing open right now.{" "}
          <button
            type="button"
            onClick={() => setOpenOnly(false)}
            className="text-clay underline"
          >
            Clear filters
          </button>
        </p>
      )}
    </>
  );
}
