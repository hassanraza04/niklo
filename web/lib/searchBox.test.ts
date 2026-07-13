import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("search suggestions use links that browsers can open in another tab", () => {
  const component = readFileSync(join(process.cwd(), "components", "SearchBox.tsx"), "utf8");

  assert.match(component, /import Link from "next\/link";/);
  assert.match(component, /<Link\s+href={`\/v\/\$\{h\.slug\}`}/);
  assert.match(component, /<Link\s+href={`\/search\?q=\$\{encodeURIComponent\(q\.trim\(\)\)\}`}/);
});

test("search suggestions use the static client catalog", () => {
  const component = readFileSync(join(process.cwd(), "components", "SearchBox.tsx"), "utf8");

  assert.match(component, /import \{ loadClientCatalog, searchClientCatalog \} from "@\/lib\/clientCatalog";/);
  assert.match(component, /loadClientCatalog\(\)/);
  assert.match(component, /searchClientCatalog\(term, catalog, 7\)/);
  assert.doesNotMatch(component, /\/api\/search/);
});
