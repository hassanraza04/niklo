import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("map route is rendered at request time", () => {
  const route = readFileSync(join(process.cwd(), "app", "map", "page.tsx"), "utf8");

  assert.match(route, /export const dynamic = "force-dynamic";/);
});

test("venue pages describe the Maps date as a source check", () => {
  const route = readFileSync(join(process.cwd(), "app", "v", "[slug]", "page.tsx"), "utf8");

  assert.match(route, /Last checked/);
  assert.doesNotMatch(route, /Last verified/);
});
