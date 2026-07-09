"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordinates } from "./geo";
import { parseStoredLocation, serializeStoredLocation } from "./locationStorage";

export type LocationStatus =
  | "checking"
  | "idle"
  | "loading"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

const KEY = "niklo:location";
const EVENT = "niklo-location";

function readStoredLocation(): { location: Coordinates | null; savedAt: number | null } {
  if (typeof window === "undefined") return { location: null, savedAt: null };
  try {
    const parsed = parseStoredLocation(localStorage.getItem(KEY));
    if (parsed.expired) {
      localStorage.removeItem(KEY);
    }
    return { location: parsed.location, savedAt: parsed.savedAt };
  } catch {
    return { location: null, savedAt: null };
  }
}

function writeStoredLocation(location: Coordinates) {
  localStorage.setItem(KEY, serializeStoredLocation(location));
  window.dispatchEvent(new Event(EVENT));
}

function clearStoredLocation() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>("checking");

  useEffect(() => {
    const refresh = () => {
      const stored = readStoredLocation();
      if (stored.location) {
        setLocation(stored.location);
        setUpdatedAt(stored.savedAt);
        setStatus("ready");
      } else {
        setLocation(null);
        setUpdatedAt(null);
        setStatus("idle");
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
        setUpdatedAt(Date.now());
        setStatus("ready");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  }, []);

  const clearLocation = useCallback(() => {
    clearStoredLocation();
    setLocation(null);
    setUpdatedAt(null);
    setStatus("idle");
  }, []);

  return { location, updatedAt, status, requestLocation, clearLocation };
}
