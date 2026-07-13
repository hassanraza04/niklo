import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const savedListPath = join(root, "components", "SavedList.tsx");
const contactPagePath = join(root, "app", "contact", "page.tsx");
const contactFormPath = join(root, "components", "ContactForm.tsx");
const footerSource = readFileSync(join(root, "components", "SiteFooter.tsx"), "utf8");
const dataNotesSource = readFileSync(join(root, "app", "data", "page.tsx"), "utf8");
const venuePageSource = readFileSync(join(root, "app", "v", "[slug]", "page.tsx"), "utf8");

test("saved places can show a distance for both new and older saves", () => {
  assert.ok(existsSync(savedListPath));
  const source = readFileSync(savedListPath, "utf8");
  assert.match(source, /VenueDistance/);
  assert.match(source, /venueCoordinates\[i\.slug\]/);
  assert.match(venuePageSource, /latitude: venue\.latitude/);
  assert.match(venuePageSource, /longitude: venue\.longitude/);
});

test("footer offers contact and LinkedIn links", () => {
  assert.match(footerSource, /href="\/contact"/);
  assert.match(footerSource, /https:\/\/www\.linkedin\.com\/in\/hassanraza04\//);
});

test("contact page has direct email and a browser-validated feedback form", () => {
  assert.ok(existsSync(contactPagePath));
  assert.ok(existsSync(contactFormPath));
  const source = readFileSync(contactPagePath, "utf8");
  const formSource = readFileSync(contactFormPath, "utf8");
  assert.match(source, /mailto:hr2616@nyu\.edu/);
  assert.match(formSource, /type="email"/);
  assert.match(formSource, /Feedback, suggestions, or questions/);
});

test("data notes acknowledge that listings can still be imperfect", () => {
  assert.match(dataNotesSource, /mistakes can\s+still slip through/i);
});
