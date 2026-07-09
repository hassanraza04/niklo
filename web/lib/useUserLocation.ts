"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "./geo";

export type LocationStatus = "idle" | "loading" | "ready" | "denied" | "unsupported" | "error";

const KEY = "niklo:location";
const EVENT = "niklo-location";

type StoredLocation = Coordinates & { savedAt: number };

function readStoredLocation(): Coordinates | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null") as StoredLocation | null;
    if (
      parsed &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number"
    ) {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    return null;
  }
  return null;
}

function writeStoredLocation(location: Coordinates) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...location, savedAt: Date.now() } satisfies StoredLocation),
  );
  window.dispatchEvent(new Event(EVENT));
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coordinates | null>(() => readStoredLocation());
  const [status, setStatus] = useState<LocationStatus>(() =>
    readStoredLocation() ? "ready" : "idle",
  );

  useEffect(() => {
    const refresh = () => {
      const stored = readStoredLocation();
      if (stored) {
        setLocation(stored);
        setStatus("ready");
      }
    };
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        writeStoredLocation(next);
        setLocation(next);
        setStatus("ready");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 10000 },
    );
  }, []);

  return { location, status, requestLocation };
}
