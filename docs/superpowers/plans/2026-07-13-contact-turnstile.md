# Contact Turnstile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect every Niklo contact submission with a server-verified Cloudflare Turnstile token before it can be sent through Resend.

**Architecture:** The Contact page reads the public Turnstile site key from the Cloudflare Worker runtime and passes it to a client form. The client renders a managed widget and sends its token with the form payload. The contact API validates that token with Cloudflare Siteverify, then sends the email only after a valid `contact` action for the current hostname.

**Tech Stack:** Next.js App Router, React, Cloudflare Workers, Cloudflare Turnstile, Resend, Node test runner, ESLint.

## Global Constraints

- Use Cloudflare managed Turnstile, not invisible mode.
- Store `TURNSTILE_SITE_KEY` as a public runtime Worker variable, never a Build Variable.
- Store `TURNSTILE_SECRET_KEY` as a runtime Worker secret and never expose it to the browser or Git.
- Verify every token at `https://challenges.cloudflare.com/turnstile/v0/siteverify` before calling Resend.
- Tokens are single-use and expire after five minutes, so reset the widget after every request.
- Keep `hr2616@nyu.edu` as the direct contact link and keep form delivery fixed to `hassanraza0406@gmail.com`.
- Use simple commit messages.

---

## File Structure

- Create `web/lib/turnstile.ts`: validates a Siteverify response and keeps Turnstile-specific types out of the contact route.
- Create `web/lib/turnstile.test.ts`: tests the Siteverify request and response validation with the real helper.
- Create `web/components/TurnstileWidget.tsx`: loads the official Turnstile script and gives the form a current token plus a reset function.
- Modify `web/components/ContactForm.tsx`: blocks submission until it has a Turnstile token and resets the token after each request.
- Modify `web/app/contact/page.tsx`: dynamically obtains the public runtime site key and passes it to the form.
- Modify `web/app/api/contact/route.ts`: validates the token before calling Resend.
- Modify `web/lib/savedContact.test.ts`: preserves structural coverage for the page, client, and route wiring.
- Modify `web/README.md` and `docs/operations/launch-checklist.md`: document the two Turnstile runtime bindings and widget configuration.

## Task 1: Turnstile Server Verification

**Files:**
- Create: `web/lib/turnstile.ts`
- Create: `web/lib/turnstile.test.ts`

**Interfaces:**
- Produces: `verifyTurnstileToken(options: { token: string; secret: string; hostname: string; remoteIp?: string }): Promise<boolean>`.
- Consumes: Cloudflare Siteverify JSON with `success`, `action`, and `hostname` fields.

- [ ] **Step 1: Write the failing test**

```ts
test("verifyTurnstileToken accepts a matching contact verification", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: true, action: "contact", hostname: "niklo.example" }),
  );

  assert.equal(
    await verifyTurnstileToken({
      token: "token",
      secret: "secret",
      hostname: "niklo.example",
      remoteIp: "127.0.0.1",
    }),
    true,
  );
});

test("verifyTurnstileToken rejects a wrong action or hostname", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: true, action: "other", hostname: "elsewhere.example" }),
  );

  assert.equal(
    await verifyTurnstileToken({ token: "token", secret: "secret", hostname: "niklo.example" }),
    false,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit`

Expected: FAIL because `lib/turnstile.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VerifyOptions = {
  token: string;
  secret: string;
  hostname: string;
  remoteIp?: string;
};

export async function verifyTurnstileToken(options: VerifyOptions) {
  const body = new URLSearchParams({ secret: options.secret, response: options.token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);

  const response = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as { success?: boolean; action?: string; hostname?: string };
  return response.ok && result.success === true && result.action === "contact" && result.hostname === options.hostname;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit`

Expected: PASS with the Turnstile tests included.

- [ ] **Step 5: Commit**

```bash
git add web/lib/turnstile.ts web/lib/turnstile.test.ts
git commit -m "add turnstile check"
```

## Task 2: Widget and Contact API Wiring

**Files:**
- Create: `web/components/TurnstileWidget.tsx`
- Modify: `web/components/ContactForm.tsx`
- Modify: `web/app/contact/page.tsx`
- Modify: `web/app/api/contact/route.ts`
- Modify: `web/lib/savedContact.test.ts`

**Interfaces:**
- Consumes: `TurnstileWidget` props `{ siteKey: string; onToken(token: string): void; onReset(): void }`.
- Consumes: `verifyTurnstileToken` from `web/lib/turnstile.ts`.
- Produces: contact JSON payload field `turnstileToken`.

- [ ] **Step 1: Write the failing test**

```ts
test("contact form submits a Turnstile token and verifies it before Resend", () => {
  const formSource = readFileSync(contactFormPath, "utf8");
  const routeSource = readFileSync(contactRoutePath, "utf8");
  assert.match(formSource, /turnstileToken/);
  assert.match(formSource, /TurnstileWidget/);
  assert.match(routeSource, /TURNSTILE_SECRET_KEY/);
  assert.match(routeSource, /verifyTurnstileToken/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit`

Expected: FAIL because the form does not yet send a Turnstile token.

- [ ] **Step 3: Write minimal implementation**

```tsx
<TurnstileWidget
  siteKey={siteKey}
  onToken={setTurnstileToken}
  onReset={() => setTurnstileToken("")}
/>
```

```ts
const turnstileToken = textValue(payload.turnstileToken);
if (!bindings.TURNSTILE_SECRET_KEY || !turnstileToken) {
  return NextResponse.json({ error: "Please complete the verification and try again." }, { status: 400 });
}

const validTurnstileToken = await verifyTurnstileToken({
  token: turnstileToken,
  secret: bindings.TURNSTILE_SECRET_KEY,
  hostname: new URL(request.url).hostname,
  remoteIp: request.headers.get("CF-Connecting-IP") || undefined,
});
if (!validTurnstileToken) {
  return NextResponse.json({ error: "Verification expired. Please try again." }, { status: 400 });
}
```

```ts
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const { env } = await getCloudflareContext({ async: true });
  return <ContactForm siteKey={env.TURNSTILE_SITE_KEY || ""} />;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npm run test:unit && npm run lint`

Expected: all unit tests and lint pass.

- [ ] **Step 5: Commit**

```bash
git add web/components/TurnstileWidget.tsx web/components/ContactForm.tsx web/app/contact/page.tsx web/app/api/contact/route.ts web/lib/savedContact.test.ts
git commit -m "add turnstile form"
```

## Task 3: Operations Documentation and Deployment Validation

**Files:**
- Modify: `web/README.md`
- Modify: `docs/operations/launch-checklist.md`

**Interfaces:**
- Consumes: Worker runtime bindings `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
- Produces: a documented widget setup and verification procedure.

- [ ] **Step 1: Write the failing test**

```ts
test("production notes document Turnstile runtime bindings", () => {
  const source = readFileSync(join(root, "README.md"), "utf8");
  assert.match(source, /TURNSTILE_SITE_KEY/);
  assert.match(source, /TURNSTILE_SECRET_KEY/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npm run test:unit`

Expected: FAIL because the runtime bindings are not yet documented.

- [ ] **Step 3: Write minimal documentation**

```md
- Create a managed Turnstile widget named `Niklo contact` for the live hostname.
- Add `TURNSTILE_SITE_KEY` as a Worker runtime variable.
- Add `TURNSTILE_SECRET_KEY` as a Worker runtime secret.
- Never place either value in Settings > Build > Build Variables and Secrets.
```

- [ ] **Step 4: Run all verification**

Run: `cd web && npm run test:unit && npm run lint && npm run build && npx opennextjs-cloudflare build`

Expected: all checks complete successfully and `/api/contact` remains dynamic.

- [ ] **Step 5: Commit**

```bash
git add web/README.md docs/operations/launch-checklist.md web/lib/savedContact.test.ts
git commit -m "document turnstile"
```

## Plan Review

- Spec coverage: Tasks 1 and 2 implement the client widget, one-time token validation, hostname and action checks, safe failures, and runtime-only bindings. Task 3 documents Cloudflare configuration and validates the production bundle.
- Placeholder scan: no incomplete implementation steps or unspecified names remain.
- Type consistency: `turnstileToken`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `verifyTurnstileToken` use the same names across every task.
