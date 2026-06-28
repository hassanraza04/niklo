"use client";

import { useEffect, useState } from "react";
import { type SavedItem, isSaved, toggleSaved, SAVED_EVENT } from "@/lib/saved";

export function SaveButton({ item }: { item: SavedItem }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const update = () => setSaved(isSaved(item.slug));
    update();
    window.addEventListener(SAVED_EVENT, update);
    return () => window.removeEventListener(SAVED_EVENT, update);
  }, [item.slug]);

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(item))}
      aria-pressed={saved}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        saved
          ? "border-clay bg-clay text-paper"
          : "border-line bg-card text-ink hover:border-clay/40"
      }`}
    >
      {saved ? "♥ Saved" : "♡ Save to list"}
    </button>
  );
}
