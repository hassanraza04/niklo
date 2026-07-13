import assert from "node:assert/strict";
import test from "node:test";

import { verifyTurnstileToken } from "./turnstile.ts";

const originalFetch = globalThis.fetch;

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

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

test("verifyTurnstileToken rejects a response with the wrong action", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: true, action: "newsletter", hostname: "niklo.example" }),
  );

  assert.equal(
    await verifyTurnstileToken({
      token: "test-token-value",
      secret: "test-secret-value",
      hostname: "niklo.example",
    }),
    false,
  );
});

test("verifyTurnstileToken rejects a response with the wrong hostname", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: true, action: "contact", hostname: "elsewhere.example" }),
  );

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

test("verifyTurnstileToken fails closed after a five-second Siteverify timeout", async (t) => {
  t.after(() => {
    globalThis.fetch = originalFetch;
    t.mock.timers.reset();
  });

  t.mock.timers.enable({ apis: ["setTimeout"] });

  let requestAborted = false;
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal;
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal.aborted, false);
    signal.addEventListener("abort", () => {
      requestAborted = true;
      reject(signal.reason);
    }, { once: true });
  });

  const verification = verifyTurnstileToken({
    token: "test-token-value",
    secret: "test-secret-value",
    hostname: "niklo.example",
  });
  let verificationResult: boolean | undefined;
  void verification.then((result) => {
    verificationResult = result;
  });

  t.mock.timers.tick(4_999);
  await flushMicrotasks();
  assert.equal(requestAborted, false);
  assert.equal(verificationResult, undefined);

  t.mock.timers.tick(1);
  await flushMicrotasks();
  assert.equal(requestAborted, true);
  assert.equal(verificationResult, false);
  assert.equal(await verification, false);

  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: true, action: "contact", hostname: "niklo.example" }),
  );

  assert.equal(
    await verifyTurnstileToken({
      token: "test-token-value",
      secret: "test-secret-value",
      hostname: "niklo.example",
    }),
    true,
  );
});
