import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const savedListPath = join(root, "components", "SavedList.tsx");
const contactPagePath = join(root, "app", "contact", "page.tsx");
const contactFormPath = join(root, "components", "ContactForm.tsx");
const turnstileWidgetPath = join(root, "components", "TurnstileWidget.tsx");
const contactRoutePath = join(root, "app", "api", "contact", "route.ts");
const saveButtonPath = join(root, "components", "SaveButton.tsx");
const venueCardPath = join(root, "components", "VenueCard.tsx");
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

test("listing cards save without nesting a button in their venue link", () => {
  const saveButton = readFileSync(saveButtonPath, "utf8");
  const venueCard = readFileSync(venueCardPath, "utf8");

  assert.match(saveButton, /variant\?: "default" \| "icon"/);
  assert.match(saveButton, /event\.preventDefault\(\)/);
  assert.match(saveButton, /event\.stopPropagation\(\)/);
  assert.match(venueCard, /<SaveButton[\s\S]*?variant="icon"/);
  assert.match(venueCard, /<article/);
  assert.match(venueCard, /<\/Link>\s*<div[^>]*>\s*<SaveButton/);
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

test("contact feedback is delivered through a server-side Resend route", () => {
  assert.ok(existsSync(contactRoutePath));
  const formSource = readFileSync(contactFormPath, "utf8");
  const routeSource = readFileSync(contactRoutePath, "utf8");
  assert.match(formSource, /fetch\("\/api\/contact"/);
  assert.match(routeSource, /https:\/\/api\.resend\.com\/emails/);
  assert.match(routeSource, /RESEND_API_KEY/);
  assert.match(routeSource, /hassanraza0406@gmail\.com/);
  assert.doesNotMatch(formSource, /RESEND_API_KEY/);
});

test("contact form submits a Turnstile token and verifies it before Resend", () => {
  const formSource = readFileSync(contactFormPath, "utf8");
  const routeSource = readFileSync(contactRoutePath, "utf8");
  assert.match(formSource, /turnstileToken/);
  assert.match(formSource, /TurnstileWidget/);
  assert.match(routeSource, /TURNSTILE_SECRET_KEY/);
  assert.match(routeSource, /verifyTurnstileToken/);
});

test("production notes document Turnstile runtime bindings", () => {
  const source = readFileSync(join(root, "README.md"), "utf8");
  assert.match(source, /TURNSTILE_SITE_KEY/);
  assert.match(source, /TURNSTILE_SECRET_KEY/);
});

test("Turnstile script loading can retry after a failed load", () => {
  const source = readFileSync(turnstileWidgetPath, "utf8");
  assert.match(source, /turnstileScript = undefined/);
  assert.match(source, /script\.remove\(\)/);
});

test("data notes acknowledge that listings can still be imperfect", () => {
  assert.match(dataNotesSource, /mistakes can\s+still slip through/i);
});
