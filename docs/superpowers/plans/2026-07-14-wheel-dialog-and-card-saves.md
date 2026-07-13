# Wheel Dialog and Card Saves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show finished wheel results in an accessible dialog and let visitors save or unsave every listing card without opening it.

**Architecture:** `SpinWheel` remains the single shared wheel and owns its dialog state. `SaveButton` gains a compact icon variant that uses the existing browser-only saved-state helpers, while `VenueCard` becomes an article containing a normal venue link and a separate save button.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, lucide-react, Node test runner.

## Global Constraints

- Keep saved places in the existing `niklo:saved` browser storage and preserve the `niklo-saved` event.
- Do not add a runtime database, account system, or dependency.
- Use Lucide icons for the close and heart controls.
- The dialog opens only after the wheel animation completes.
- A dialog close icon, Escape, and a backdrop click close the dialog without changing the result.
- Card save controls must not be nested inside listing links or navigate to the listing page.
- Keep the existing text save control on venue detail pages.
- Use short commit messages.

---

### Task 1: Add Independent Card Save Controls

**Files:**
- Modify: `web/components/SaveButton.tsx`
- Modify: `web/components/VenueCard.tsx`
- Test: `web/lib/savedContact.test.ts`

**Interfaces:**
- Consumes: `toggleSaved(item)`, `isSaved(slug)`, and `SAVED_EVENT` from `web/lib/saved.ts`.
- Produces: `SaveButton({ item, variant?: "default" | "icon" })` for detail pages and listing cards.

- [ ] **Step 1: Write the failing test**

Add this source-level test to `web/lib/savedContact.test.ts`:

```ts
const saveButtonPath = join(root, "components", "SaveButton.tsx");
const venueCardPath = join(root, "components", "VenueCard.tsx");

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- --test-name-pattern "listing cards save"`

Expected: FAIL because `SaveButton` has no icon variant and `VenueCard` has no independent control.

- [ ] **Step 3: Implement the smallest shared save-control change**

Update `SaveButton` with a variant prop, a Lucide `Heart`, and one click handler:

```tsx
export function SaveButton({ item, variant = "default" }: { item: SavedItem; variant?: "default" | "icon" }) {
  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setSaved(toggleSaved(item));
  }

  if (variant === "icon") {
    return (
      <button type="button" onClick={toggle} aria-pressed={saved}
        aria-label={`${saved ? "Remove" : "Save"} ${item.name}`} title={saved ? "Remove from shortlist" : "Save to shortlist"}
        className="rounded-full border border-line bg-card p-2 text-ink shadow-sm hover:border-clay/40">
        <Heart aria-hidden className={saved ? "fill-current" : ""} />
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={saved}
      className={saved ? "rounded-full border border-clay bg-clay px-4 py-2 text-sm font-semibold text-paper" : "rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-clay/40"}>
      {saved ? "♥ Saved" : "♡ Save to list"}
    </button>
  );
}
```

Restructure `VenueCard` into an `article` with a `Link` for the card content and an absolutely positioned sibling:

```tsx
<article className="group relative min-w-0 rounded-[var(--radius-card)]">
  <Link href={`/v/${venue.slug}`} className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md active:translate-y-0">
    {/** Move the current image block and detail block into this Link unchanged. */}
  </Link>
  <div className="absolute right-3 top-3 z-10">
    <SaveButton item={{ slug: venue.slug, name: venue.name, sub: venue.subcategory_name, area, rating: venue.rating, reviews: venue.review_count, photo: venue.photo_url, latitude: venue.latitude, longitude: venue.longitude }} variant="icon" />
  </div>
</article>
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:unit -- --test-name-pattern "listing cards save"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/SaveButton.tsx web/components/VenueCard.tsx web/lib/savedContact.test.ts
git commit -m "add card saves"
```

### Task 2: Present Wheel Results in an Accessible Dialog

**Files:**
- Modify: `web/components/SpinWheel.tsx`
- Test: `web/lib/responsiveLayout.test.ts`

**Interfaces:**
- Consumes: existing `Seg`, `segments`, `lead`, and `goLabel` props.
- Produces: a result dialog that opens after the existing 4.3-second animation timeout.

- [ ] **Step 1: Write the failing test**

Add this test to `web/lib/responsiveLayout.test.ts`:

```ts
test("wheel results open in a dismissible dialog", () => {
  assert.match(spinWheelSource, /role="dialog"/);
  assert.match(spinWheelSource, /aria-modal="true"/);
  assert.match(spinWheelSource, /event\.key === "Escape"/);
  assert.match(spinWheelSource, /event\.target === event\.currentTarget/);
  assert.match(spinWheelSource, /ref=\{closeButtonRef\}/);
  assert.match(spinWheelSource, /<X aria-hidden/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- --test-name-pattern "wheel results open"`

Expected: FAIL because `SpinWheel` still renders an inline result panel.

- [ ] **Step 3: Implement the dialog**

Extend `SpinWheel` with dialog state, focus, and Escape handling:

```tsx
const [dialogOpen, setDialogOpen] = useState(false);
const closeButtonRef = useRef<HTMLButtonElement>(null);

function closeDialog() {
  setDialogOpen(false);
}

useEffect(() => {
  if (!dialogOpen) return;
  closeButtonRef.current?.focus();
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") setDialogOpen(false);
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [dialogOpen]);
```

When the animation timeout sets the result, also call `setDialogOpen(true)`. Replace the inline panel with:

```tsx
{result && dialogOpen && (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5"
    onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="wheel-result-title" className="relative w-full max-w-md rounded-[var(--radius-card)] border border-line bg-card p-6 text-center shadow-xl">
      <button ref={closeButtonRef} type="button" onClick={closeDialog} aria-label="Close result" className="absolute right-3 top-3 rounded-full p-2 text-ink-soft hover:bg-paper-2 hover:text-ink">
        <X aria-hidden className="h-5 w-5" />
      </button>
      <p className="text-sm text-ink-soft">{lead}</p>
      <h2 id="wheel-result-title" className="mt-1 font-display text-2xl font-semibold text-ink">{result.label}</h2>
      {result.tag && <p className="text-ink-soft">{result.tag}</p>}
      <div className="mt-5 flex justify-center gap-3">
        {result.href && <Link href={result.href} className="rounded-full bg-pine px-5 py-2.5 font-semibold text-paper">{goLabel}</Link>}
        <button type="button" onClick={spin} className="rounded-full border border-line px-5 py-2.5 font-semibold text-ink hover:border-clay/40">
          {result.href ? "Nah, again" : "Spin again"}
        </button>
      </div>
    </section>
  </div>
)}
```

Update `spin()` so it closes an open dialog before calculating the next result.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:unit -- --test-name-pattern "wheel results open"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/SpinWheel.tsx web/lib/responsiveLayout.test.ts
git commit -m "add wheel popup"
```

### Task 3: Verify the Combined Interaction

**Files:**
- Verify only: `web/components/SaveButton.tsx`
- Verify only: `web/components/VenueCard.tsx`
- Verify only: `web/components/SpinWheel.tsx`

- [ ] **Step 1: Run all web static checks**

Run: `npm run test:unit && npm run lint && npx tsc --noEmit`

Expected: all Node tests pass, lint exits zero, and TypeScript exits zero.

- [ ] **Step 2: Run the production build**

Run: `npx opennextjs-cloudflare build`

Expected: `OpenNext build complete.` and only `/contact` plus `/api/contact` are dynamic.

- [ ] **Step 3: Commit any final adjustment only when needed**

```bash
git status --short
```

Expected: no uncommitted implementation files remain.
