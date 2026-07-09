import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-20 text-center">
      <p className="font-display text-lg italic text-clay">Nothing here</p>
      <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
        This page slipped out of the plan.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-ink-soft">
        The place may have moved, the link may be old, or the page may not exist yet.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-clay px-5 py-2.5 font-semibold text-paper transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Go home
        </Link>
        <Link
          href="/c/sports-active/padel"
          className="rounded-full border border-line bg-card px-5 py-2.5 font-semibold text-ink transition-colors hover:border-clay/40"
        >
          Browse spots
        </Link>
      </div>
    </div>
  );
}
