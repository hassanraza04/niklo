import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-2">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 text-sm text-ink-soft sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-display text-lg text-ink">Niklo</p>
          <p className="mt-1 max-w-md">
            A little side project to answer the eternal Karachi question, &ldquo;yaar
            kya karein?&rdquo;
          </p>
          <p className="mt-4 max-w-2xl text-xs leading-relaxed">
            Ratings and details come from public Google Maps listings and may change.
            Use Niklo as a starting point, then check directly with the venue before
            making serious plans.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 sm:justify-end" aria-label="Footer">
          <Link href="/privacy" className="hover:text-clay">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-clay">
            Terms
          </Link>
          <Link href="/data" className="hover:text-clay">
            Data notes
          </Link>
          <Link href="/contact" className="hover:text-clay">
            Contact
          </Link>
          <a
            href="https://github.com/hassanraza04/niklo"
            target="_blank"
            rel="noreferrer"
            className="hover:text-clay"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/hassanraza04/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-clay"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
