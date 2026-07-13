"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { canonicalArea } from "@/lib/areas";
import { loadClientCatalog, searchClientCatalog } from "@/lib/clientCatalog";
import type { CatalogCardVenue } from "@/lib/types";

export function SearchBox({
  defaultValue = "",
  size = "sm",
  autoFocus = false,
}: {
  defaultValue?: string;
  size?: "sm" | "lg";
  autoFocus?: boolean;
}) {
  const big = size === "lg";
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<CatalogCardVenue[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    let active = true;
    const t = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        setTotal(0);
        setOpen(false);
        return;
      }
      try {
        const catalog = await loadClientCatalog();
        if (!active) return;
        const suggestions = searchClientCatalog(term, catalog, 7);
        setHits(suggestions);
        setTotal(searchClientCatalog(term, catalog).length);
        setActive(-1);
        setOpen(true);
      } catch {
        if (active) setOpen(false);
      }
    }, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  // close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function goSearch(term: string) {
    if (!term.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && hits[active]) {
      setOpen(false);
      router.push(`/v/${hits[active].slug}`);
    } else {
      goSearch(q);
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <form action="/search" role="search" onSubmit={onSubmit}>
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft">
          <svg
            width={big ? 20 : 16}
            height={big ? 20 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocusCapture={() => hits.length && setOpen(true)}
          autoFocus={autoFocus}
          placeholder={big ? "Search venues, areas, categories…" : "Search…"}
          aria-label="Search venues"
          autoComplete="off"
          className={`w-full rounded-full border border-line bg-card text-ink placeholder:text-ink-soft/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20 ${
            big ? "py-3 pl-11 pr-4 text-base" : "py-1.5 pl-9 pr-3 text-sm"
          }`}
        />
      </form>

      {open && hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
          <ul>
            {hits.map((h, i) => {
              const area = canonicalArea(h) ?? h.area;
              return (
                <li key={h.slug}>
                  <Link
                    href={`/v/${h.slug}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                      active === i ? "bg-paper-2" : "hover:bg-paper-2"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{h.name}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {h.subcategory_name}
                        {area ? ` · ${area}` : ""}
                      </span>
                    </span>
                    {h.rating != null && (
                      <span className="shrink-0 text-sm font-semibold text-pine">
                        <span className="text-marigold">★</span> {h.rating.toFixed(1)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={`/search?q=${encodeURIComponent(q.trim())}`}
            onClick={() => setOpen(false)}
            className="block w-full border-t border-line px-4 py-2.5 text-left text-sm font-medium text-clay hover:bg-paper-2"
          >
            See all {total} result{total === 1 ? "" : "s"} for &ldquo;{q.trim()}&rdquo; →
          </Link>
        </div>
      )}
    </div>
  );
}
