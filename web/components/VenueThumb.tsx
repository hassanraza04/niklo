"use client";
/* eslint-disable @next/next/no-img-element -- google thumbnails, images.unoptimized is on */

import { useState } from "react";

// shows the google thumbnail, but falls back to a homey gradient + initial when
// there's no photo or the image url fails to load (google cdn links can expire).
export function VenueThumb({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-clay/15 to-marigold/20">
      <span className="font-display text-4xl text-clay/50">{name.charAt(0)}</span>
    </div>
  );
}
