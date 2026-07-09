export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-display text-lg italic text-clay">Terms</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Niklo is a guide, not a booking service.
      </h1>
      <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
        <p>
          Niklo helps you discover public venue listings in Karachi. Details can be
          wrong, stale, or incomplete, so confirm timings, prices, availability, and
          rules directly with the venue before you go.
        </p>
        <p>
          Links to maps, websites, and phone numbers take you to third-party services.
          Those services have their own terms and privacy practices.
        </p>
        <p>
          Use the site responsibly. Do not scrape it heavily, attack it, or rely on it
          as the only source for urgent or important decisions.
        </p>
      </div>
    </div>
  );
}
