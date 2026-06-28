export function SearchBox({
  defaultValue = "",
  size = "sm",
  autoFocus = false,
}: {
  defaultValue?: string;
  size?: "sm" | "lg";
  autoFocus?: boolean;
}) {
  const big = size === "lg";
  return (
    <form action="/search" role="search" className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-soft">
        <svg
          width={big ? 20 : 16}
          height={big ? 20 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        placeholder={big ? "Search venues, areas, categories…" : "Search…"}
        aria-label="Search venues"
        className={`w-full rounded-full border border-line bg-card text-ink placeholder:text-ink-soft/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20 ${
          big ? "py-3 pl-11 pr-4 text-base" : "py-1.5 pl-9 pr-3 text-sm"
        }`}
      />
    </form>
  );
}
