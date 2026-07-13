import type { MetadataRoute } from "next";
import { categories } from "@/lib/taxonomy";
import { catalogSlugs } from "@/lib/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://niklo.pk";

function url(path: string) {
  return `${siteUrl}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/search"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/saved"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: url("/spin"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: url("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
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

  const venueRoutes: MetadataRoute.Sitemap = catalogSlugs().map((slug) => ({
    url: url(`/v/${slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...venueRoutes];
}
