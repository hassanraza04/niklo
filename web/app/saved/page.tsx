"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type SavedItem, readSaved, removeSaved, SAVED_EVENT } from "@/lib/saved";

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => setItems(readSaved());
    refresh();
    window.addEventListener(SAVED_EVENT, refresh);
    return () => window.removeEventListener(SAVED_EVENT, refresh);
  }, []);

  function share() {
    const url = `${window.location.origin}/plan?v=${items.map((i) => i.slug).join(",")}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl font-semibold text-ink">Your shortlist</h1>
      <p className="mt-2 text-ink-soft">
        The places you saved for tonight. Share the link and let your friends vote with their feet.
      </p>

      {items.length > 0 && (
        <button
          onClick={share}
          className="mt-5 rounded-full bg-clay px-5 py-2.5 font-semibold text-paper transition-transform hover:-translate-y-0.5"
        >
          {copied ? "Link copied ✓" : "Share this list"}
        </button>
      )}

      {items.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">Nothing saved yet</p>
          <p className="mt-2 text-ink-soft">
            Hit &ldquo;Save to list&rdquo; on any venue and it&apos;ll show up here.
          </p>
          <Link
            href="/c/sports-active/padel"
            className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
          >
            Start browsing
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((i) => (
            <li
              key={i.slug}
              className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3"
            >
              <Link href={`/v/${i.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-clay/15 to-marigold/20">
                  {i.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.photo} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-semibold text-ink">
                    {i.name}
                  </span>
                  <span className="block truncate text-sm text-ink-soft">
                    {i.sub}
                    {i.area ? ` · ${i.area}` : ""}
                    {i.rating ? ` · ★ ${i.rating.toFixed(1)}` : ""}
                  </span>
                </span>
              </Link>
              <button
                onClick={() => removeSaved(i.slug)}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2 hover:text-clay"
                aria-label={`Remove ${i.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
