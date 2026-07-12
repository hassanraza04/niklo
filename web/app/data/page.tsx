export const metadata = { title: "Data notes" };

export default function DataNotesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="font-display text-lg italic text-clay">Data notes</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Built from public venue information, then cleaned by hand.
      </h1>
      <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
        <p>
          Niklo uses public listing details such as names, addresses, hours, ratings, and review counts.
          It does not rehost review text. Venue pages link back to Google Maps when you need the latest
          details.
        </p>
        <p>
          Listings are cleaned for duplicates, category mistakes, low-quality imports, and missing location
          data before they appear here. The daily verification workflow checks existing listings only. New
          places stay in a separate review queue until they are manually approved.
        </p>
        <p>
          Hours, pricing, availability, and ratings can change. Treat Niklo as a useful starting point and
          confirm directly with a venue before making a plan.
        </p>
      </div>
    </div>
  );
}
