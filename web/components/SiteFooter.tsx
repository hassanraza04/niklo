export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-2">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-ink-soft">
        <p className="font-display text-lg text-ink">Niklo</p>
        <p className="mt-1 max-w-md">
          A little side project to answer the eternal Karachi question, &ldquo;yaar
          kya karein?&rdquo;
        </p>
        <p className="mt-4 text-xs">
          Ratings &amp; details pulled from public Google Maps listings, refreshed
          every so often. Spotted something wrong or missing? It happens, venues
          come and go fast here.
        </p>
      </div>
    </footer>
  );
}
