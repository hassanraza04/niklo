import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, findSubcategory } from "@/lib/taxonomy";
import { catalogBySubcategory } from "@/lib/catalog";
import { Breadcrumb } from "@/components/Breadcrumb";
import { subcategoryIcon } from "@/lib/icons";
import { SubcategoryResults } from "@/components/SubcategoryResults";

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      category: category.slug,
      subcategory: subcategory.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { subcategory } = await params;
  const found = findSubcategory(subcategory);
  return { title: found ? `${found.sub.name} in Karachi` : "Browse" };
}

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>;
}) {
  const { category, subcategory } = await params;
  const found = findSubcategory(subcategory);
  if (!found || found.category.slug !== category) notFound();
  const { category: cat, sub } = found;

  const venues = catalogBySubcategory(subcategory);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: cat.name, href: `/c/${cat.slug}` },
          { label: sub.name },
        ]}
      />

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl">{subcategoryIcon(sub.slug, cat.slug)}</span>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            {sub.name} in Karachi
          </h1>
          <p className="text-ink-soft">
            {venues.length === 0
              ? "Nothing here yet"
              : `${venues.length} ${venues.length === 1 ? "place" : "places"} we found`}
          </p>
        </div>
      </header>

      {venues.length > 0 ? (
        <SubcategoryResults venues={venues} />
      ) : (
        <div className="mt-12 rounded-[var(--radius-card)] border border-dashed border-line bg-card p-10 text-center">
          <p className="font-display text-xl text-ink">
            We haven&apos;t mapped {sub.name.toLowerCase()} yet
          </p>
          <p className="mt-2 text-ink-soft">
            Try another type, or browse everything Niklo has mapped so far.
          </p>
          <Link
            href="/#browse"
            className="mt-5 inline-block rounded-full bg-clay px-5 py-2.5 font-semibold text-paper"
          >
            Browse all types
          </Link>
        </div>
      )}
    </div>
  );
}
