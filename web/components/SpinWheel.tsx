"use client";

import { useState } from "react";
import Link from "next/link";

type Seg = { name: string; slug: string; area?: string | null };

const COLORS = ["#c75b39", "#1f6b4f", "#e9a523", "#a8462a", "#16513c", "#d2762f"];

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180; // 0deg = top, clockwise
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function short(name: string, max = 14): string {
  return name.length > max ? name.slice(0, max - 1).trimEnd() + "…" : name;
}

export function SpinWheel({ segments }: { segments: Seg[] }) {
  const segs = segments.slice(0, 10);
  const n = segs.length;
  const sweep = n ? 360 / n : 360;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Seg | null>(null);

  function spin() {
    if (spinning || n === 0) return;
    setResult(null);
    setSpinning(true);
    const idx = Math.floor(Math.random() * n);
    const mid = (idx + 0.5) * sweep;
    const landing = (360 - (mid % 360)) % 360;
    setRotation((prev) => prev - (prev % 360) + 360 * 6 + landing);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(segs[idx]);
    }, 4300);
  }

  const cx = 170,
    cy = 170,
    r = 160;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 340, height: 360 }}>
        {/* pointer */}
        <div className="absolute left-1/2 top-1 z-10 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-clay drop-shadow" />
        </div>

        <svg
          viewBox="0 0 340 340"
          width="340"
          height="340"
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
              <g key={s.slug}>
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
                  {short(s.name)}
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

      {result && !spinning && (
        <div className="mt-6 w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-card p-6 text-center shadow-md">
          <p className="text-sm text-ink-soft">Tonight you&apos;re going to</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink">
            {result.name}
          </p>
          {result.area && <p className="text-ink-soft">{result.area}</p>}
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href={`/v/${result.slug}`}
              className="rounded-full bg-pine px-5 py-2.5 font-semibold text-paper"
            >
              Let&apos;s go →
            </Link>
            <button
              onClick={spin}
              className="rounded-full border border-line px-5 py-2.5 font-semibold text-ink hover:border-clay/40"
            >
              Nah, again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
