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
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-transparent bg-transparent transition-colors ${
          saved
            ? "text-clay"
            : "text-ink-soft hover:bg-paper-2 hover:text-clay"
        }`}
      >
        <Heart
          aria-hidden
          strokeWidth={1.5}
          className={`h-[1.15rem] w-[1.15rem] ${saved ? "fill-current" : ""}`}
        />
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
