"use client";

import { Heart } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { type SavedItem, isSaved, toggleSaved, SAVED_EVENT } from "@/lib/saved";

export function SaveButton({
  item,
  variant = "default",
}: {
  item: SavedItem;
  variant?: "default" | "icon";
}) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const update = () => setSaved(isSaved(item.slug));
    update();
    window.addEventListener(SAVED_EVENT, update);
    return () => window.removeEventListener(SAVED_EVENT, update);
  }, [item.slug]);

  function handleToggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setSaved(toggleSaved(item));
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${item.name}`}
        title={saved ? "Remove from shortlist" : "Save to shortlist"}
        className={`rounded-full border p-2 shadow-sm transition-colors ${
          saved
            ? "border-clay bg-clay text-paper"
            : "border-line bg-card text-ink hover:border-clay/40"
        }`}
      >
        <Heart aria-hidden className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
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
