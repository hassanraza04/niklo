import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold tracking-tight text-clay">
            Niklo
          </span>
          <span className="hidden text-sm text-ink-soft sm:inline">
            things to do in Karachi
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <Link
            href="/c/sports-active/padel"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
          >
            Browse
          </Link>
          <Link
            href="/spin"
            className="rounded-full bg-marigold px-3.5 py-1.5 text-sm font-semibold text-ink shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Can&apos;t decide? Spin
          </Link>
        </nav>
      </div>
    </header>
  );
}
