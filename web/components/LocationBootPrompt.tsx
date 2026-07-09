"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  shouldPromptForLocationOnBoot,
  shouldShowLocationDeniedPrompt,
} from "@/lib/locationPrompt";
import { useUserLocation } from "@/lib/useUserLocation";

const SESSION_KEY = "niklo:location-boot-prompted";
const SESSION_EVENT = "niklo-location-prompt";

function readPromptedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function rememberPromptChoice() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Ignore private-mode storage failures.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function subscribeToPromptChoice(onStoreChange: () => void) {
  window.addEventListener(SESSION_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function LocationBootPrompt() {
  const { location, status, requestLocation } = useUserLocation();
  const requestedRef = useRef(false);
  const [acceptedIntroPrompt, setAcceptedIntroPrompt] = useState(false);
  const [acknowledgedDeniedPrompt, setAcknowledgedDeniedPrompt] = useState(false);
  const promptedThisSession = useSyncExternalStore(
    subscribeToPromptChoice,
    readPromptedThisSession,
    () => true,
  );

  const showIntroPrompt = shouldPromptForLocationOnBoot({
    location,
    status,
    promptedThisSession,
  });
  const showDeniedPrompt = shouldShowLocationDeniedPrompt({
    status,
    acceptedIntroPrompt,
    acknowledgedDeniedPrompt,
  });

  function acceptIntroPrompt() {
    setAcceptedIntroPrompt(true);
    rememberPromptChoice();
    if (requestedRef.current) return;
    requestedRef.current = true;
    requestLocation();
  }

  function declineIntroPrompt() {
    rememberPromptChoice();
  }

  function closeDeniedPrompt() {
    setAcknowledgedDeniedPrompt(true);
    rememberPromptChoice();
  }

  return (
    <>
      {showIntroPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-4 py-6 sm:items-center">
          <section
            aria-labelledby="location-intro-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl"
            role="dialog"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
              Optional location
            </p>
            <h2
              className="mt-2 font-display text-2xl font-semibold text-ink"
              id="location-intro-title"
            >
              See what is closest to you
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Niklo can use your location to show distance on places and sort by nearest.
              Your location stays in this browser and is only used for this distance feature.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-pine-dark"
                type="button"
                onClick={acceptIntroPrompt}
              >
                Use my location
              </button>
              <button
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-ink transition hover:border-clay hover:text-clay"
                type="button"
                onClick={declineIntroPrompt}
              >
                Not now
              </button>
            </div>
          </section>
        </div>
      )}

      {showDeniedPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 px-4 py-6 sm:items-center">
          <section
            aria-labelledby="location-denied-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl"
            role="dialog"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
              Location is off
            </p>
            <h2
              className="mt-2 font-display text-2xl font-semibold text-ink"
              id="location-denied-title"
            >
              We could not get your location
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              You can still use Niklo normally. To see distances later, allow location
              from your browser settings and tap a distance button on any place.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-clay-dark"
                type="button"
                onClick={closeDeniedPrompt}
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
