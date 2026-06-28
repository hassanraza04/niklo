import { spinPool } from "@/lib/venues";
import { canonicalArea } from "@/lib/areas";
import { SpinWheel } from "@/components/SpinWheel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Can't decide? Spin" };

export default async function SpinPage() {
  const pool = await spinPool("padel", 10);
  const segments = pool.map((v) => ({
    name: v.name,
    slug: v.slug,
    area: canonicalArea(v),
  }));

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 text-center">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Can&apos;t decide? Spin.
      </h1>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">
        Ten padel courts on the wheel. Give it a spin and stop overthinking it.
      </p>

      <div className="mt-10">
        {segments.length > 0 ? (
          <SpinWheel segments={segments} />
        ) : (
          <p className="text-ink-soft">Nothing to spin yet. Load some venues first.</p>
        )}
      </div>
    </div>
  );
}
