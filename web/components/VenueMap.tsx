// free osm embed, no api key. just a little static-ish map with a marker.
export function VenueMap({
  lat,
  lon,
  name,
}: {
  lat: number;
  lon: number;
  name: string;
}) {
  const d = 0.006;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  return (
    <iframe
      title={`Map of ${name}`}
      src={src}
      loading="lazy"
      className="h-56 w-full rounded-2xl border border-line"
    />
  );
}
