import test from "node:test";
import assert from "node:assert/strict";
import { buildVenueSearchPlan } from "./venueSearchPlan.ts";

test("venue search ranks exact and phrase name matches before popularity", () => {
  const plan = buildVenueSearchPlan("English Snooker", false, 60);

  assert.ok(plan);
  assert.match(plan.statement, /when lower\(name\) = \? then 0/);
  assert.match(plan.statement, /when lower\(name\) like \? then 1/);
  assert.deepEqual(plan.binds.slice(-8), [
    "english snooker",
    "english snooker%",
    "%english snooker%",
    "english snooker",
    "english snooker",
    "english snooker",
    "%english snooker%",
    60,
  ]);
});

test("venue search keeps address matching as a fallback only", () => {
  const strong = buildVenueSearchPlan("marksman", false, 7);
  const fallback = buildVenueSearchPlan("marksman", true, 7);

  assert.ok(strong);
  assert.ok(fallback);
  assert.doesNotMatch(strong.statement, /address like \?/);
  assert.match(fallback.statement, /address like \?/);
});

test("venue search ignores wildcard-only input", () => {
  assert.equal(buildVenueSearchPlan("% _", false, 7), null);
});
