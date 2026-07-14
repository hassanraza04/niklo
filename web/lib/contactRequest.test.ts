import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_CONTACT_REQUEST_BYTES,
  isJsonContactRequest,
  isReasonablySizedContactRequest,
  isSameOriginRequest,
} from "./contactRequest.ts";

test("contact requests must declare the current site as their origin", () => {
  const sameOrigin = new Request("https://niklo.example/api/contact", {
    headers: { Origin: "https://niklo.example" },
  });
  const missingOrigin = new Request("https://niklo.example/api/contact");
  const crossOrigin = new Request("https://niklo.example/api/contact", {
    headers: { Origin: "https://attacker.example" },
  });

  assert.equal(isSameOriginRequest(sameOrigin), true);
  assert.equal(isSameOriginRequest(missingOrigin), false);
  assert.equal(isSameOriginRequest(crossOrigin), false);
});

test("contact requests must be small JSON payloads", () => {
  const json = new Request("https://niklo.example/api/contact", {
    headers: { "Content-Type": "application/json", "Content-Length": "256" },
  });
  const formEncoded = new Request("https://niklo.example/api/contact", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const oversized = new Request("https://niklo.example/api/contact", {
    headers: { "Content-Type": "application/json", "Content-Length": String(MAX_CONTACT_REQUEST_BYTES + 1) },
  });

  assert.equal(isJsonContactRequest(json), true);
  assert.equal(isJsonContactRequest(formEncoded), false);
  assert.equal(isReasonablySizedContactRequest(json), true);
  assert.equal(isReasonablySizedContactRequest(oversized), false);
});
