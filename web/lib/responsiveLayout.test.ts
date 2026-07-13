import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mapModeSource = readFileSync(join(process.cwd(), "components", "MapMode.tsx"), "utf8");
const spinWheelSource = readFileSync(join(process.cwd(), "components", "SpinWheel.tsx"), "utf8");

test("map grid children can shrink on narrow screens", () => {
  assert.match(mapModeSource, /grid min-w-0 gap-4 lg:grid-cols-\[320px_1fr\]/);
  assert.match(mapModeSource, /section className="grid min-w-0 gap-4/);
  assert.match(mapModeSource, /relative min-w-0 overflow-hidden/);
});

test("spin wheel uses the available width instead of a fixed phone overflow", () => {
  assert.match(spinWheelSource, /aspect-\[17\/18\] w-full max-w-\[340px\]/);
  assert.match(spinWheelSource, /className="block aspect-square w-full"/);
  assert.doesNotMatch(spinWheelSource, /style=\{\{ width: 340, height: 360 \}\}/);
});

test("wheel results open in a dismissible dialog", () => {
  assert.match(spinWheelSource, /role="dialog"/);
  assert.match(spinWheelSource, /aria-modal="true"/);
  assert.match(spinWheelSource, /event\.key === "Escape"/);
  assert.match(spinWheelSource, /event\.target === event\.currentTarget/);
  assert.match(spinWheelSource, /ref=\{closeButtonRef\}/);
  assert.match(spinWheelSource, /<X aria-hidden/);
});
