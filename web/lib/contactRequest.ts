export const MAX_CONTACT_REQUEST_BYTES = 8 * 1024;

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isJsonContactRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().startsWith("application/json");
}

export function isReasonablySizedContactRequest(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return true;

  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 && length <= MAX_CONTACT_REQUEST_BYTES;
}

export async function parseContactJson(request: Request): Promise<unknown> {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_CONTACT_REQUEST_BYTES) {
    throw new RangeError("Contact request is too large.");
  }
  return JSON.parse(body) as unknown;
}
