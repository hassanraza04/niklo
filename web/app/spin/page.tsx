import { countsBySubcategory } from "@/lib/venues";
import { categories } from "@/lib/taxonomy";
import { SpinBuilder, type Activity } from "@/components/SpinBuilder";

export const dynamic = "force-dynamic";

export const metadata = { title: "Can't decide? Spin" };

export default async function SpinPage() {
  const counts = await countsBySubcategory();

  // every activity we actually have venues for, busiest first
  const available: Activity[] = categories
    .flatMap((cat) =>
      cat.subcategories
        .filter((sub) => (counts[sub.slug] ?? 0) > 0)
        .map((sub) => ({
          subSlug: sub.slug,
          name: sub.name,
          href: `/c/${cat.slug}/${sub.slug}`,
          count: counts[sub.slug] ?? 0,
        })),
    )
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold text-ink">
          Can&apos;t decide? Spin.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          It picks the activity, not a spot across town. Put what you&apos;d actually
          consider on the wheel, throw in your own ideas, then let it choose. You sort
          out where after.
        </p>
      </div>

      <SpinBuilder available={available} />
    </div>
  );
}
