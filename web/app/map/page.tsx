import { MapMode } from "@/components/MapMode";
import { categories } from "@/lib/taxonomy";
import { listAllVenues } from "@/lib/venues";
import type { MapVenue } from "@/lib/mapMode";

export const metadata = {
  title: "Map",
  description: "See Karachi entertainment places on a map by type.",
};

export default async function MapPage() {
  const venues = (await listAllVenues())
    .filter((venue) => venue.latitude != null && venue.longitude != null)
    .map(
      (venue): MapVenue => ({
        slug: venue.slug,
        name: venue.name,
        category_slug: venue.category_slug,
        category_name: venue.category_name,
        subcategory_name: venue.subcategory_name,
        category_slugs: venue.category_slugs,
        latitude: venue.latitude ?? 0,
        longitude: venue.longitude ?? 0,
        area: venue.area,
        rating: venue.rating,
        review_count: venue.review_count,
      }),
    );

  return <MapMode venues={venues} categories={categories} />;
}
