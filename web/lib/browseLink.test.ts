import assert from "node:assert/strict";
import test from "node:test";
import { scrollToBrowse } from "./browseLink.ts";

test("browse scrolls when the home hash is already present", () => {
  const calls: ScrollIntoViewOptions[] = [];
  const target = {
    scrollIntoView: (options: ScrollIntoViewOptions) => calls.push(options),
  } as Element;

  scrollToBrowse(target, false);
  scrollToBrowse(target, false);

  assert.deepEqual(calls, [
    { behavior: "smooth", block: "start" },
    { behavior: "smooth", block: "start" },
  ]);
});

test("browse respects reduced motion", () => {
  const calls: ScrollIntoViewOptions[] = [];
  const target = {
    scrollIntoView: (options: ScrollIntoViewOptions) => calls.push(options),
  } as Element;

  scrollToBrowse(target, true);

  assert.deepEqual(calls, [{ behavior: "auto", block: "start" }]);
});
