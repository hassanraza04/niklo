import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory } from "@/lib/taxonomy";
import { countsBySubcategory, listVenuesByCategory } from "@/lib/venues";
import { VenueCard } from "@/components/VenueCard";
import { Breadcrumb } from "@/components/Breadcrumb";
import { categoryIcon, subcategoryIcon } from "@/lib/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const c = getCategory(category);
  return { title: c ? c.name : "Browse" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const [counts, venues] = await Promise.all([
    countsBySubcategory(),
    listVenuesByCategory(slug),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: category.name }]} />

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl">{categoryIcon(category.slug)}</span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            {category.name}
          </h1>
          {category.blurb && <p className="text-ink-soft">{category.blurb}</p>}
        </div>
      </header>

      {/* subcategories */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {category.subcategories.map((sub) => {
          const n = counts[sub.slug] ?? 0;
          return (
            <Link
              key={sub.slug}
              href={`/c/${category.slug}/${sub.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-clay/40 hover:shadow-sm"
            >
              <span className="text-2xl">
                {subcategoryIcon(sub.slug, category.slug)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {sub.name}
                </span>
                <span className="text-sm text-ink-soft">
                  {n > 0 ? `${n} places` : "soon"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* top venues across the category */}
      {venues.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Top {category.name.toLowerCase()} spots
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {venues.slice(0, 8).map((v) => (
              <VenueCard key={v.venue_id} venue={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
