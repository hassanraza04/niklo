"use client";

import { useEffect, useState } from "react";
import { SpinWheel, type Seg } from "./SpinWheel";

// an activity the user can drop on the wheel (one of our live subcategories)
export type Activity = { subSlug: string; name: string; href: string; count: number };

const MAX = 10;
const KEY = "niklo:wheel";

export function SpinBuilder({ available }: { available: Activity[] }) {
  const bySlug = new Map(available.map((a) => [a.subSlug, a]));

  const [onWheel, setOnWheel] = useState<string[]>(() =>
    available.slice(0, 8).map((a) => a.subSlug),
  );
  const [custom, setCustom] = useState<string[]>([]);
  const [text, setText] = useState("");

  // restore a wheel the user built before, then keep it saved as they edit.
  // the restore is deferred to a microtask so it lands after hydration (server
  // and first client render both show the default, so no mismatch).
  useEffect(() => {
    let live = true;
    queueMicrotask(() => {
      if (!live) return;
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const p = JSON.parse(raw);
        if (Array.isArray(p.onWheel))
          setOnWheel(p.onWheel.filter((s: string) => bySlug.has(s)));
        if (Array.isArray(p.custom)) setCustom(p.custom.slice(0, MAX));
      } catch {
        // ignore a corrupt saved wheel
      }
    });
    return () => {
      live = false;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ onWheel, custom }));
    } catch {
      // storage may be unavailable; the wheel still works for this visit
    }
  }, [onWheel, custom]);

  const total = onWheel.length + custom.length;
  const full = total >= MAX;
  const remaining = available.filter((a) => !onWheel.includes(a.subSlug));

  const segments: Seg[] = [
    ...onWheel
      .map((s) => bySlug.get(s))
      .filter((a): a is Activity => !!a)
      .map((a) => ({
        label: a.name,
        href: a.href,
        tag: `${a.count} ${a.count === 1 ? "place" : "places"}`,
      })),
    ...custom.map((c) => ({ label: c, tag: "your idea" })),
  ];

  function addCat(slug: string) {
    if (full) return;
    setOnWheel((w) => (w.includes(slug) ? w : [...w, slug]));
  }
  function removeCat(slug: string) {
    setOnWheel((w) => w.filter((s) => s !== slug));
  }
  function addCustom() {
    const t = text.trim().slice(0, 24);
    if (!t || full) return;
    setCustom((c) => (c.includes(t) ? c : [...c, t]));
    setText("");
  }
  function removeCustom(t: string) {
    setCustom((c) => c.filter((x) => x !== t));
  }

  return (
    <div className="mt-10">
      {segments.length >= 2 ? (
        <SpinWheel segments={segments} lead="The wheel says" goLabel="See spots near you →" />
      ) : (
        <p className="text-center text-ink-soft">
          Put at least two things on the wheel to spin.
        </p>
      )}

      {/* what's on the wheel right now */}
      <div className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">On the wheel</h2>
          <span className="text-sm text-ink-soft">
            {total}/{MAX}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {onWheel
            .map((s) => bySlug.get(s))
            .filter((a): a is Activity => !!a)
            .map((a) => (
              <button
                key={a.subSlug}
                onClick={() => removeCat(a.subSlug)}
                className="group inline-flex items-center gap-1.5 rounded-full bg-clay px-3.5 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-clay/85"
                aria-label={`Remove ${a.name} from the wheel`}
              >
                {a.name}
                <span className="opacity-70 group-hover:opacity-100">✕</span>
              </button>
            ))}
          {custom.map((c) => (
            <button
              key={c}
              onClick={() => removeCustom(c)}
              className="group inline-flex items-center gap-1.5 rounded-full bg-pine px-3.5 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-pine/85"
              aria-label={`Remove ${c} from the wheel`}
            >
              {c}
              <span className="opacity-70 group-hover:opacity-100">✕</span>
            </button>
          ))}
          {total === 0 && (
            <p className="text-ink-soft">Empty. Add a few activities below.</p>
          )}
        </div>
      </div>

      {/* add an activity from the catalogue */}
      <div className="mt-7">
        <h2 className="font-display text-lg font-semibold text-ink">Add an activity</h2>
        {full && (
          <p className="mt-1 text-sm text-ink-soft">
            Wheel is full at {MAX}. Remove one to add another.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {remaining.map((a) => (
            <button
              key={a.subSlug}
              onClick={() => addCat(a.subSlug)}
              disabled={full}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-clay/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + {a.name} <span className="text-ink-soft">{a.count}</span>
            </button>
          ))}
          {remaining.length === 0 && (
            <p className="text-ink-soft">Everything is already on the wheel.</p>
          )}
        </div>
      </div>

      {/* add your own text */}
      <div className="mt-7">
        <h2 className="font-display text-lg font-semibold text-ink">Add your own</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustom();
            }}
            placeholder="e.g. order food, movie at home, chai dhaba"
            maxLength={24}
            className="w-full max-w-sm rounded-full border border-line bg-card px-4 py-2 text-ink outline-none focus:border-clay/50"
          />
          <button
            onClick={addCustom}
            disabled={full || !text.trim()}
            className="rounded-full bg-ink px-5 py-2 font-semibold text-paper transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
