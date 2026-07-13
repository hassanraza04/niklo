"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// a wheel segment is just a label, with an optional link to "go there" and an
// optional bit of subtext. works for venues, categories, or custom text.
export type Seg = { label: string; href?: string; tag?: string | null };

const COLORS = ["#c75b39", "#1f6b4f", "#e9a523", "#a8462a", "#16513c", "#d2762f"];

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180; // 0deg = top, clockwise
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function short(name: string, max = 14): string {
  return name.length > max ? name.slice(0, max - 1).trimEnd() + "…" : name;
}

export function SpinWheel({
  segments,
  lead = "Tonight you're going to",
  goLabel = "Let's go →",
}: {
  segments: Seg[];
  lead?: string;
  goLabel?: string;
}) {
  const segs = segments.slice(0, 10);
  const n = segs.length;
  const sweep = n ? 360 / n : 360;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Seg | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialogOpen) return;

    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDialogOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialogOpen]);

  function spin() {
    if (spinning || n === 0) return;
    setDialogOpen(false);
    setResult(null);
    setSpinning(true);
    const idx = Math.floor(Math.random() * n);
    const mid = (idx + 0.5) * sweep;
    const landing = (360 - (mid % 360)) % 360;
    setRotation((prev) => prev - (prev % 360) + 360 * 6 + landing);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(segs[idx]);
      setDialogOpen(true);
    }, 4300);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  const cx = 170,
    cy = 170,
    r = 160;

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-[17/18] w-full max-w-[340px]">
        {/* pointer */}
        <div className="absolute left-1/2 top-1 z-10 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-clay drop-shadow" />
        </div>

        <svg
          viewBox="0 0 340 340"
          className="block aspect-square w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? "transform 4s cubic-bezier(0.16, 0.84, 0.18, 1)"
              : "none",
          }}
        >
          {segs.map((s, i) => {
            const start = i * sweep;
            const end = (i + 1) * sweep;
            const [x1, y1] = polar(cx, cy, r, start);
            const [x2, y2] = polar(cx, cy, r, end);
            const large = sweep > 180 ? 1 : 0;
            const path =
              n === 1
                ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            const mid = start + sweep / 2;
            return (
              <g key={i}>
                <path d={path} fill={COLORS[i % COLORS.length]} stroke="#faf5ec" strokeWidth="2" />
                <text
                  transform={`rotate(${mid} ${cx} ${cy})`}
                  x={cx}
                  y={cy - r + 22}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#fffdf8"
                >
                  {short(s.label)}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r="30" fill="#fffdf8" stroke="#e7dcc7" strokeWidth="2" />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="16">
            🎡
          </text>
        </svg>
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="mt-2 rounded-full bg-clay px-8 py-3 text-lg font-semibold text-paper shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {spinning ? "Spinning…" : result ? "Spin again" : "Spin the wheel"}
      </button>

      {result && dialogOpen && !spinning && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wheel-result-title"
            className="relative w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-6 text-center shadow-xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeDialog}
              aria-label="Close result"
              className="absolute right-3 top-3 rounded-full p-2 text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <X aria-hidden className="h-5 w-5" />
            </button>
            <p className="text-sm text-ink-soft">{lead}</p>
            <h2 id="wheel-result-title" className="mt-1 font-display text-2xl font-semibold text-ink">
              {result.label}
            </h2>
            {result.tag && <p className="text-ink-soft">{result.tag}</p>}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {result.href && (
                <Link
                  href={result.href}
                  className="rounded-full bg-pine px-5 py-2.5 font-semibold text-paper"
                >
                  {goLabel}
                </Link>
              )}
              <button
                type="button"
                onClick={spin}
                className="rounded-full border border-line px-5 py-2.5 font-semibold text-ink hover:border-clay/40"
              >
                {result.href ? "Nah, again" : "Spin again"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
