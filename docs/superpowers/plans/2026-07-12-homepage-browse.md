# Homepage Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put category browsing before the Tonight Finder, make Crowd Favourites popularity-first, and remove stale Niklo Picks.

**Architecture:** Keep homepage section layout in `web/app/page.tsx`. Make `topVenues` a review-count-first query in `web/lib/venues.ts`. Remove the now-unused static collection import and data module, together with its list route.

**Tech Stack:** Next.js, TypeScript, Cloudflare D1, Node test runner.

## Global Constraints

- Keep the public directory login-free and static-data driven.
- Use the existing local data and test patterns.
- Use short, simple commit messages.

---

### Task 1: Popular Crowd Favourites

**Files:**
- Modify: `web/lib/venues.ts`
- Create: `web/lib/homepage.test.ts`

**Interfaces:**
- Produces: `topVenues(limit)` ordered by `review_count DESC`, then rating and name.

- [ ] **Step 1: Write the failing test**

```ts
test("topVenues orders crowd favourites by review count", () => {
  assert.match(topVenues.toString(), /order by review_count desc/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit`

- [ ] **Step 3: Write minimal implementation**

```ts
prepare(`select * from venues where review_count is not null
  order by review_count desc nulls last, rating desc nulls last, name limit ?`)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit`

### Task 2: Browse-First Homepage

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/lib/homepage.test.ts`
- Delete: `web/lib/collections.ts`
- Delete: `web/app/list/[slug]/page.tsx`

**Interfaces:**
- Consumes: `topVenues(8)` with popularity ordering.
- Produces: A homepage with Browse by type before Tonight Finder and no Niklo Picks block.

- [ ] **Step 1: Write the failing test**

```ts
test("home page is browse first without static Niklo picks", () => {
  const source = readFileSync("app/page.tsx", "utf8");
  assert.ok(source.indexOf("Browse by type") < source.indexOf("TonightFinder"));
  assert.doesNotMatch(source, /Niklo picks|collections/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit`

- [ ] **Step 3: Write minimal implementation**

Move the category section above `<TonightFinder>`, remove the collections import and section, then delete `web/lib/collections.ts` and `web/app/list/[slug]/page.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit && npm run lint`

### Task 3: Verify And Commit

**Files:**
- Modify: changed homepage and venue query files from Tasks 1-2.

- [ ] **Step 1: Run the full checks**

Run: `cd web && npm run test:unit && npm run lint && npm run build`

- [ ] **Step 2: Review the diff**

Run: `git diff --check && git status --short`

- [ ] **Step 3: Commit**

Run: `git commit -m "improve home"`
