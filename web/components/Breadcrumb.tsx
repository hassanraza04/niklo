import Link from "next/link";

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {item.href ? (
            <Link href={item.href} className="hover:text-clay">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="text-line">/</span>}
        </span>
      ))}
    </nav>
  );
}
