"use client";

import { useState } from "react";
import { addManySaved, type SavedItem } from "@/lib/saved";

// lets a friend who opened a shared plan pull the whole shortlist onto their own
// saved list, so they can add their own spots and reshare.
export function AddAllButton({ items }: { items: SavedItem[] }) {
  const [added, setAdded] = useState<number | null>(null);

  function addAll() {
    const n = addManySaved(items);
    setAdded(n);
    window.setTimeout(() => setAdded(null), 2500);
  }

  return (
    <button
      onClick={addAll}
      className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold text-ink transition-colors hover:border-clay/40"
    >
      {added === null
        ? "Add all to my list"
        : added === 0
          ? "Already on your list ✓"
          : `Added ${added} ✓`}
    </button>
  );
}
