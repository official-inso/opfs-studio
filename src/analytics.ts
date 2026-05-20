import { elsEvent } from "./els/client";

const METRIKA_ID = "103954503";

/**
 * Allowed parameter keys for trackEvent. Anything else is dropped to avoid
 * leaking user-controlled data (file paths, names, contents) into analytics.
 */
const PARAM_WHITELIST = new Set<string>([
  "theme",
  "lang",
  "ext",
  "kind",
  "count",
]);

/**
 * Send a pageview-like hit.
 */
export function trackPage(path: string): void {
  const url = buildUrl(path);
  sendPixel(url);
  // Mirror to ELS (no-op when disabled). `path` is a fixed code string.
  elsEvent(path);
}

/**
 * Send a named event. Only whitelisted params are forwarded; everything else
 * (paths, names, free-form strings) is dropped at this boundary.
 */
export function trackEvent(
  name: string,
  params?: Record<string, string>
): void {
  const safe = new URLSearchParams({ event: name });
  const safeParams: Record<string, string> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (!PARAM_WHITELIST.has(k)) continue;
      if (typeof v !== "string") continue;
      // Cap value length so even allowed params can't carry payloads.
      const capped = v.slice(0, 64);
      safe.set(k, capped);
      safeParams[k] = capped;
    }
  }
  const url = buildUrl(`event/${name}?${safe.toString()}`);
  sendPixel(url);
  // Mirror to ELS (no-op when disabled) — only the same whitelisted params.
  elsEvent(name, safeParams);
}

function buildUrl(path: string): string {
  const rn = Math.floor(Math.random() * 1e6);
  return `https://mc.yandex.ru/watch/${METRIKA_ID}/?browser-info=${encodeURIComponent(
    `pv:1:rn:${rn}:ar:1:`
  )}&page-url=${encodeURIComponent(`chrome-extension://${chrome.runtime.id}/${path}`)}`;
}

function sendPixel(url: string): void {
  // Use fetch(no-cors) instead of `new Image()`: image requests are governed by
  // the extension CSP `img-src` (which does not allow mc.yandex.ru), and Image
  // is unavailable in the service worker. fetch goes through `connect-src https:`
  // (allowed) and works on extension pages and in the service worker alike.
  try {
    void fetch(url, { method: "GET", mode: "no-cors", credentials: "omit" });
  } catch (e) {
    console.warn("Yandex Metrika send failed", e);
  }
}
