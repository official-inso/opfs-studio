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
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (!PARAM_WHITELIST.has(k)) continue;
      if (typeof v !== "string") continue;
      // Cap value length so even allowed params can't carry payloads.
      safe.set(k, v.slice(0, 64));
    }
  }
  const url = buildUrl(`event/${name}?${safe.toString()}`);
  sendPixel(url);
}

function buildUrl(path: string): string {
  const rn = Math.floor(Math.random() * 1e6);
  return `https://mc.yandex.ru/watch/${METRIKA_ID}/?browser-info=${encodeURIComponent(
    `pv:1:rn:${rn}:ar:1:`
  )}&page-url=${encodeURIComponent(`chrome-extension://${chrome.runtime.id}/${path}`)}`;
}

function sendPixel(url: string): void {
  try {
    const img = new Image();
    img.src = url;
  } catch (e) {
    console.warn("Yandex Metrika send failed", e);
  }
}
