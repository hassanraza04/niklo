import type { Coordinates } from "./geo.ts";
import type { LocationStatus } from "./useUserLocation";

export function shouldPromptForLocationOnBoot({
  location,
  status,
  promptedThisSession,
}: {
  location: Coordinates | null;
  status: LocationStatus;
  promptedThisSession: boolean;
}): boolean {
  return !location && status === "idle" && !promptedThisSession;
}

export function shouldShowLocationDeniedPrompt({
  status,
  acceptedIntroPrompt,
  acknowledgedDeniedPrompt,
}: {
  status: LocationStatus;
  acceptedIntroPrompt: boolean;
  acknowledgedDeniedPrompt: boolean;
}): boolean {
  return (
    ["denied", "unsupported", "error"].includes(status) &&
    acceptedIntroPrompt &&
    !acknowledgedDeniedPrompt
  );
}
