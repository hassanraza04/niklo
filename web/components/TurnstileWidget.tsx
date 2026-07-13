"use client";

import { useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScript: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScript) return turnstileScript;

  const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  const script = existingScript || document.createElement("script");
  const createdScript = !existingScript;
  const scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const handleLoad = () => {
      if (window.turnstile) {
        resolve(window.turnstile);
      } else {
        reject(new Error("Turnstile did not initialize."));
      }
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")), { once: true });

    if (createdScript) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
  });

  turnstileScript = scriptPromise;
  void scriptPromise.catch(() => {
    if (turnstileScript !== scriptPromise) return;
    turnstileScript = undefined;
    if (createdScript) script.remove();
  });

  return turnstileScript;
}

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onReset: () => void;
};

export function TurnstileWidget({ siteKey, onToken, onReset }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      onReset();
      return;
    }

    let active = true;
    let api: TurnstileApi | undefined;
    let widgetId: string | undefined;

    void loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        api = turnstile;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "contact",
          callback: onToken,
          "expired-callback": onReset,
          "error-callback": onReset,
        });
      })
      .catch(() => {
        if (active) onReset();
      });

    return () => {
      active = false;
      if (api && widgetId) api.remove(widgetId);
      onReset();
    };
  }, [onReset, onToken, siteKey]);

  return <div ref={containerRef} />;
}
