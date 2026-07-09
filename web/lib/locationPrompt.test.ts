import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldPromptForLocationOnBoot,
  shouldShowLocationDeniedPrompt,
} from "./locationPrompt.ts";

test("shouldPromptForLocationOnBoot prompts only when idle, unsaved, and not already prompted", () => {
  assert.equal(
    shouldPromptForLocationOnBoot({
      location: null,
      status: "idle",
      promptedThisSession: false,
    }),
    true,
  );
  assert.equal(
    shouldPromptForLocationOnBoot({
      location: { latitude: 24.8138, longitude: 67.0305 },
      status: "ready",
      promptedThisSession: false,
    }),
    false,
  );
  assert.equal(
    shouldPromptForLocationOnBoot({
      location: null,
      status: "checking",
      promptedThisSession: false,
    }),
    false,
  );
  assert.equal(
    shouldPromptForLocationOnBoot({
      location: null,
      status: "denied",
      promptedThisSession: false,
    }),
    false,
  );
  assert.equal(
    shouldPromptForLocationOnBoot({
      location: null,
      status: "idle",
      promptedThisSession: true,
    }),
    false,
  );
});

test("shouldShowLocationDeniedPrompt appears only after user opts in and browser blocks location", () => {
  assert.equal(
    shouldShowLocationDeniedPrompt({
      status: "denied",
      acceptedIntroPrompt: true,
      acknowledgedDeniedPrompt: false,
    }),
    true,
  );
  assert.equal(
    shouldShowLocationDeniedPrompt({
      status: "denied",
      acceptedIntroPrompt: false,
      acknowledgedDeniedPrompt: false,
    }),
    false,
  );
  assert.equal(
    shouldShowLocationDeniedPrompt({
      status: "idle",
      acceptedIntroPrompt: true,
      acknowledgedDeniedPrompt: false,
    }),
    false,
  );
  assert.equal(
    shouldShowLocationDeniedPrompt({
      status: "denied",
      acceptedIntroPrompt: true,
      acknowledgedDeniedPrompt: true,
    }),
    false,
  );
});
