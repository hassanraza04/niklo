# Contact Turnstile Design

## Goal

Protect Niklo's public contact form from automated submissions before they can use the
Resend email API, without adding friction for ordinary visitors.

## Chosen Approach

Use a Cloudflare Turnstile managed widget on `/contact`.

Managed mode is the least intrusive choice. It normally verifies visitors in the
background and only asks for interaction when Cloudflare detects suspicious traffic.

## Data Flow

1. The Contact page reads the public `TURNSTILE_SITE_KEY` from the Worker runtime
   environment and passes it to the client form.
2. The form renders Cloudflare's Turnstile script and includes the issued token with
   the contact submission.
3. The contact route checks its existing validation and then sends the token, the
   runtime-only `TURNSTILE_SECRET_KEY`, and the visitor IP to Cloudflare Siteverify.
4. Only a successful verification with the `contact` action and the request hostname
   can proceed to Resend.
5. The client resets Turnstile after each send attempt because its tokens are
   single-use and expire after five minutes.

## Runtime Configuration

Cloudflare must store these as Worker runtime bindings, never Build Variables:

- `TURNSTILE_SITE_KEY`: a public Worker variable.
- `TURNSTILE_SECRET_KEY`: a Worker secret.

The site key is safe to send to browsers. The secret key remains in the Worker and is
only used for Siteverify. The existing `RESEND_API_KEY` remains a Worker secret.

## Failure Handling

- A missing or failed widget token stops the form and explains that verification is
  required.
- An expired or used token returns a clear retry message and resets the widget.
- A missing Turnstile runtime binding prevents sending rather than allowing an
  unprotected fallback.
- Siteverify failures are logged without logging visitor messages, tokens, or secrets.

## Verification

- Add regression coverage for the client token submission and server Siteverify call.
- Run unit tests, lint, the Next production build, and the OpenNext Cloudflare build.
- After deployment, create a managed Turnstile widget named `Niklo contact`, allow the
  live hostname, add both runtime bindings, and submit one real contact message.
