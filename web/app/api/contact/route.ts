import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import {
  isJsonContactRequest,
  isReasonablySizedContactRequest,
  isSameOriginRequest,
  parseContactJson,
} from "@/lib/contactRequest";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const RECIPIENT = "hassanraza0406@gmail.com";
const DEFAULT_SENDER = "Niklo <onboarding@resend.dev>";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 4_000;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
  turnstileToken?: unknown;
};

type ContactBindings = {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validationError(payload: ContactPayload) {
  const name = textValue(payload.name);
  const email = textValue(payload.email);
  const message = textValue(payload.message);

  if (textValue(payload.company)) return "Unable to send this message.";
  if (name.length > MAX_NAME_LENGTH || /[\r\n]/.test(name)) {
    return "Please keep your name under 100 characters.";
  }
  if (email.length > MAX_EMAIL_LENGTH || (email && !EMAIL_PATTERN.test(email))) {
    return "Please enter a valid email address.";
  }
  if (!message) return "Please add a message.";
  if (message.length > MAX_MESSAGE_LENGTH) return "Please keep your message under 4,000 characters.";

  return null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (!isJsonContactRequest(request)) {
    return NextResponse.json({ error: "Invalid request format." }, { status: 415 });
  }

  if (!isReasonablySizedContactRequest(request)) {
    return NextResponse.json({ error: "Your message is too large." }, { status: 413 });
  }

  let payload: ContactPayload;
  try {
    payload = (await parseContactJson(request)) as ContactPayload;
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: "Your message is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Please complete the form and try again." }, { status: 400 });
  }

  const error = validationError(payload);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const name = textValue(payload.name);
  const email = textValue(payload.email);
  const message = textValue(payload.message);
  const turnstileToken = textValue(payload.turnstileToken);
  const { env } = await getCloudflareContext({ async: true });
  const bindings = env as CloudflareEnv & ContactBindings;

  if (!bindings.TURNSTILE_SECRET_KEY || !turnstileToken) {
    return NextResponse.json({ error: "Please complete the verification and try again." }, { status: 400 });
  }

  let validTurnstileToken = false;
  try {
    validTurnstileToken = await verifyTurnstileToken({
      token: turnstileToken,
      secret: bindings.TURNSTILE_SECRET_KEY,
      hostname: new URL(request.url).hostname,
      remoteIp: request.headers.get("CF-Connecting-IP") || undefined,
    });
  } catch {
    console.error("Turnstile verification failed.");
  }

  if (!validTurnstileToken) {
    return NextResponse.json({ error: "Verification expired. Please try again." }, { status: 400 });
  }

  if (!bindings.RESEND_API_KEY) {
    console.error("Contact form is missing its Resend API key.");
    return NextResponse.json({ error: "The contact form is unavailable right now. Please email directly." }, { status: 503 });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bindings.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: bindings.RESEND_FROM_EMAIL || DEFAULT_SENDER,
      to: [RECIPIENT],
      reply_to: email || undefined,
      subject: name ? `Niklo feedback from ${name}` : "Niklo feedback",
      text: [
        "Niklo contact form submission",
        `Name: ${name || "Not provided"}`,
        `Email: ${email || "Not provided"}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    console.error("Resend rejected a Niklo contact message.", response.status);
    return NextResponse.json({ error: "Your message could not be sent. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
