import Link from "next/link";
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

        <div className="mx-auto w-full max-w-xs sm:max-w-sm">
          <SearchBox />
        </div>

        <nav className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/c/sports-active/padel"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink sm:inline-block"
          >
            Browse
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
