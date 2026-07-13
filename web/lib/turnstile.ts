const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type VerifyOptions = {
  token: string;
  secret: string;
  hostname: string;
  remoteIp?: string;
};

export async function verifyTurnstileToken(options: VerifyOptions): Promise<boolean> {
  const body = new URLSearchParams({ secret: options.secret, response: options.token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);

  const response = await fetch(SITEVERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
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
}
