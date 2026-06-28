import { searchVenues } from "@/lib/venues";
import { canonicalArea } from "@/lib/areas";

export const dynamic = "force-dynamic";

// lightweight json endpoint for the live search dropdown
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ hits: [], total: 0 });

  const all = await searchVenues(q, 50);
  const hits = all.slice(0, 7).map((v) => ({
    slug: v.slug,
    name: v.name,
    area: canonicalArea(v) ?? v.area,
    subcategory_name: v.subcategory_name,
    rating: v.rating,
    review_count: v.review_count,
  }));
  return Response.json({ hits, total: all.length });
}
