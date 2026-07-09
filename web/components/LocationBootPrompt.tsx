"use client";

import { useEffect, useRef } from "react";
import { shouldPromptForLocationOnBoot } from "@/lib/locationPrompt";
import { useUserLocation } from "@/lib/useUserLocation";

const SESSION_KEY = "niklo:location-boot-prompted";

export function LocationBootPrompt() {
  const { location, status, requestLocation } = useUserLocation();
  const requestedRef = useRef(false);

  useEffect(() => {
    let promptedThisSession = false;
    try {
      promptedThisSession = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      promptedThisSession = false;
    }

    if (!shouldPromptForLocationOnBoot({ location, status, promptedThisSession })) {
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;
    requestLocation();
  }, [location, requestLocation, status]);

  useEffect(() => {
    if (!location && !["denied", "unsupported", "error"].includes(status)) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore private-mode storage failures.
    }
  }, [location, status]);

  return null;
}
