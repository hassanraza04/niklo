"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { BrowseLink } from "./BrowseLink";
import { SearchBox } from "./SearchBox";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = () => setMenuOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-semibold tracking-tight text-clay"
        >
          Niklo
        </Link>

        <div className="min-w-0 flex-1 md:mx-auto md:max-w-sm">
          <SearchBox />
        </div>

        <nav className="flex shrink-0 items-center gap-1.5" aria-label="Primary">
          <div className="relative md:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink shadow-sm transition-colors hover:bg-paper-2"
            >
              <Menu aria-hidden="true" size={19} strokeWidth={2.25} />
            </button>
            {menuOpen && (
              <div
                id="mobile-navigation"
                className="absolute right-0 top-[calc(100%+0.5rem)] w-36 rounded-[var(--radius-card)] border border-line bg-card p-1 shadow-md"
              >
                <BrowseLink
                  className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Browse
                </BrowseLink>
                <Link
                  href="/saved"
                  className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Saved
                </Link>
                <Link
                  href="/map"
                  className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
                  onClick={() => setMenuOpen(false)}
                >
                  Map
                </Link>
              </div>
            )}
          </div>
          <BrowseLink
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink md:inline-block"
          >
            Browse
          </BrowseLink>
          <Link
            href="/saved"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink md:inline-block"
          >
            Saved
          </Link>
          <Link
            href="/map"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink md:inline-block"
          >
            Map
          </Link>
          <Link
            href="/spin"
            className="rounded-full bg-marigold px-3.5 py-1.5 text-sm font-semibold text-ink shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <span className="hidden sm:inline">Can&apos;t decide? </span>Spin
          </Link>
        </nav>
      </div>
    </header>
  );
}
