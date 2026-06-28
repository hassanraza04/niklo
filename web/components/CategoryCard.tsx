import Link from "next/link";
import type { Category } from "@/lib/taxonomy";
import { categoryIcon } from "@/lib/icons";

export function CategoryCard({
  category,
  count,
}: {
  category: Category;
  count: number;
}) {
  return (
    <Link
      href={`/c/${category.slug}`}
      className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-clay/40 hover:shadow-md"
    >
      <span className="text-3xl">{categoryIcon(category.slug)}</span>
      <div>
        <h3 className="font-display text-xl font-semibold text-ink group-hover:text-clay">
          {category.name}
        </h3>
        {category.blurb && (
          <p className="mt-0.5 text-sm text-ink-soft">{category.blurb}</p>
        )}
      </div>
      <p className="mt-auto text-sm font-medium text-ink-soft">
        {count > 0 ? (
          <span className="text-pine">{count} places</span>
        ) : (
          <span className="text-ink-soft/70">coming soon</span>
        )}
      </p>
    </Link>
  );
}
