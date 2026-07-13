import Link from "next/link";
import { Menu } from "lucide-react";
import { SearchBox } from "./SearchBox";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-semibold tracking-tight text-clay"
        >
          Niklo
        </Link>

        <div className="mx-auto min-w-0 w-full max-w-xs sm:max-w-sm">
          <SearchBox />
        </div>

        <nav className="flex shrink-0 items-center gap-1.5" aria-label="Primary">
          <details className="relative md:hidden">
            <summary
              aria-label="Open navigation"
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-card text-ink shadow-sm transition-colors hover:bg-paper-2 [&::-webkit-details-marker]:hidden"
            >
              <Menu aria-hidden="true" size={19} strokeWidth={2.25} />
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-36 rounded-[var(--radius-card)] border border-line bg-card p-1 shadow-md">
              <Link
                href="/#browse"
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
              >
                Browse
              </Link>
              <Link
                href="/saved"
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
              >
                Saved
              </Link>
              <Link
                href="/map"
                className="block rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-paper-2"
              >
                Map
              </Link>
            </div>
          </details>
          <Link
            href="/#browse"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink md:inline-block"
          >
            Browse
          </Link>
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
