import taxonomy from "./taxonomy.json";

export type SubCategory = { slug: string; name: string; synonyms?: string[] };
export type Category = {
  slug: string;
  name: string;
  blurb?: string;
  subcategories: SubCategory[];
};

export const categories = taxonomy.categories as Category[];

export function getCategory(slug: string): Category | null {
  return categories.find((c) => c.slug === slug) ?? null;
}

export function findSubcategory(
  subSlug: string,
): { category: Category; sub: SubCategory } | null {
  for (const category of categories) {
    const sub = category.subcategories.find((s) => s.slug === subSlug);
    if (sub) return { category, sub };
  }
  return null;
}
