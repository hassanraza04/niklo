const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5_000;

type VerifyOptions = {
  token: string;
  secret: string;
  hostname: string;
  remoteIp?: string;
};

export async function verifyTurnstileToken(options: VerifyOptions): Promise<boolean> {
  const body = new URLSearchParams({ secret: options.secret, response: options.token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SITEVERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return response.ok
      && result.success === true
      && result.action === "contact"
      && result.hostname === options.hostname;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
