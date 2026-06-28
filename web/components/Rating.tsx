export function Rating({
  rating,
  reviewCount,
  size = "sm",
}: {
  rating: number | null;
  reviewCount: number | null;
  size?: "sm" | "lg";
}) {
  if (rating == null) {
    return (
      <span className="text-sm text-ink-soft">No ratings yet</span>
    );
  }
  const big = size === "lg";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-pine/10 font-semibold text-pine ${
          big ? "px-2.5 py-1 text-base" : "px-2 py-0.5 text-sm"
        }`}
      >
        <span className="text-marigold">★</span>
        {rating.toFixed(1)}
      </span>
      {reviewCount != null && (
        <span className={big ? "text-sm text-ink-soft" : "text-xs text-ink-soft"}>
          {reviewCount.toLocaleString()} {reviewCount === 1 ? "review" : "reviews"}
        </span>
      )}
    </span>
  );
}
