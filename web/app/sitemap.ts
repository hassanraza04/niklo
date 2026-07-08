import type { MetadataRoute } from "next";
import { categories } from "@/lib/taxonomy";
import { allVenueSlugs } from "@/lib/venues";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://niklo.pk";

export const dynamic = "force-dynamic";

function url(path: string) {
  return `${siteUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const venueSlugs = await allVenueSlugs();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/search"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/saved"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: url("/spin"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap((category) => [
    {
      url: url(`/c/${category.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...category.subcategories.map((subcategory) => ({
      url: url(`/c/${category.slug}/${subcategory.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]);

  const venueRoutes: MetadataRoute.Sitemap = venueSlugs.map((slug) => ({
    url: url(`/v/${slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...venueRoutes];
}
