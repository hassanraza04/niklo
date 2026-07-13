"use client";

import Link from "next/link";
import type { PointerEventHandler, PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { scrollToBrowse } from "@/lib/browseLink";

export { scrollToBrowse } from "@/lib/browseLink";

type BrowseLinkProps = PropsWithChildren<{
  className?: string;
  onClick?: () => void;
  onPointerDown?: PointerEventHandler<HTMLAnchorElement>;
}>;

export function BrowseLink({
  children,
  className,
  onClick,
  onPointerDown,
}: BrowseLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href="/#browse"
      className={className}
      onPointerDown={onPointerDown}
      onClick={(event) => {
        onClick?.();
        if (pathname !== "/") return;

        event.preventDefault();
        const target = document.getElementById("browse");
        if (!target) return;

        scrollToBrowse(
          target,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        window.history.replaceState(null, "", "/#browse");
      }}
    >
      {children}
    </Link>
  );
}
