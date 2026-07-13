import assert from "node:assert/strict";
import test from "node:test";

import { verifyTurnstileToken } from "./turnstile.ts";

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
