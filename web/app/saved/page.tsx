import { SavedList } from "@/components/SavedList";
import { listVenueCoordinates } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  return <SavedList venueCoordinates={await listVenueCoordinates()} />;
}
