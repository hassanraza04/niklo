import { MapMode } from "@/components/MapMode";
import { categories } from "@/lib/taxonomy";

export const metadata = {
  title: "Map",
  description: "See Karachi entertainment places on a map by type.",
};

export default function MapPage() {
  return <MapMode categories={categories} />;
}
