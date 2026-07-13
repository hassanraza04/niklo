import assert from "node:assert/strict";
import test from "node:test";

import { verifyTurnstileToken } from "./turnstile.ts";

const originalFetch = globalThis.fetch;

test("verifyTurnstileToken posts the expected Siteverify form", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init) => {
    assert.equal(input, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("Content-Type"), "application/x-www-form-urlencoded");
    assert.ok(init?.signal instanceof AbortSignal);

    const form = new URLSearchParams(init?.body as URLSearchParams);
    assert.equal(form.get("secret"), "test-secret-value");
    assert.equal(form.get("response"), "test-token-value");
    assert.equal(form.get("remoteip"), "127.0.0.1");

    return new Response(
      JSON.stringify({ success: true, action: "contact", hostname: "niklo.example" }),
    );
  };

  assert.equal(
    await verifyTurnstileToken({
      token: "test-token-value",
      secret: "test-secret-value",
      hostname: "niklo.example",
      remoteIp: "127.0.0.1",
    }),
    true,
  );
});

test("verifyTurnstileToken rejects a Siteverify failure response", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (_input, init) => {
    const form = new URLSearchParams(init?.body as URLSearchParams);
    assert.equal(form.get("secret"), "test-secret-value");
    assert.equal(form.get("response"), "test-token-value");
    assert.equal(form.has("remoteip"), false);

    return new Response(JSON.stringify({ success: false }), { status: 400 });
  };

  assert.equal(
    await verifyTurnstileToken({
      token: "test-token-value",
      secret: "test-secret-value",
      hostname: "niklo.example",
    }),
    false,
  );
});

test("verifyTurnstileToken fails closed when Siteverify cannot be reached", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => {
    throw new Error("Siteverify is unavailable");
  };

  assert.equal(
    await verifyTurnstileToken({
      token: "test-token-value",
      secret: "test-secret-value",
      hostname: "niklo.example",
    }),
    false,
  );
});
