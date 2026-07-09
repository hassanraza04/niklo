export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-display text-lg italic text-clay">Privacy</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Your location stays in your browser.
      </h1>
      <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
        <p>
          Niklo can ask for location access so it can show distance and sort nearby
          places. That location is stored locally in your browser and is not sent to
          Niklo&apos;s database.
        </p>
        <p>
          Saved places and wheel preferences are also kept in your browser. If you
          clear browser data, those saved items may disappear.
        </p>
        <p>
          Venue ratings, addresses, photos, and links come from public listing data.
          Niklo does not collect account details, payment details, or booking details.
        </p>
      </div>
    </div>
  );
}
