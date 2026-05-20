import { ELSClient, type ELSConfig } from "@inso_web/els-client";

/**
 * ELS (Event Logging Service) wiring.
 *
 * The ingest endpoint is a fixed public URL (hard-coded). Only the API key is
 * a secret: it is injected at build time (vite `define`, see vite.config.ts)
 * from a CI secret variable — never committed to the repo. When the key is
 * missing (local/dev/contributor builds), ELS is disabled and every helper
 * here is a silent no-op, so the extension works without it.
 *
 * What we send: explicit product events (mirrored from analytics) and errors /
 * stacktraces. We never include OPFS file names/paths/contents, typed text,
 * page URLs or PII — only whitelisted event params and code-level stacktraces.
 */

// Public ELS ingest endpoint (fixed). `__ELS_ENDPOINT__` may override it in a
// build, otherwise this default is used.
const ENDPOINT = __ELS_ENDPOINT__ || "https://api.insoweb.ru/els";
const API_KEY = __ELS_API_KEY__;

export const elsConfig: ELSConfig | null = API_KEY
  ? {
        endpoint: ENDPOINT,
        apiKey: API_KEY,
        appSlug: "opfs-studio",
        serviceName: "opfs-studio-extension",
        deploymentEnv: __ELS_ENV__,
        appVersion: __APP_VERSION__,
      }
    : null;

/**
 * Standalone client for non-React contexts (analytics funnel, service worker).
 * React surfaces use <ELSProvider config={elsConfig}> which builds its own.
 * All ELSClient methods are fire-and-forget and never throw.
 */
export const elsClient: ELSClient | null = (() => {
  if (!elsConfig) return null;
  try {
    return new ELSClient(elsConfig);
  } catch {
    return null;
  }
})();

/** Log a product event. No-op when ELS is disabled. */
export function elsEvent(name: string, params?: Record<string, string>): void {
  if (!elsClient) return;
  try {
    elsClient.info({ event: name, ...(params ?? {}) }, name);
  } catch {
    // fire-and-forget
  }
}

/** Report an error / stacktrace. No-op when ELS is disabled. */
export function elsError(err: unknown, context?: string): void {
  if (!elsClient) return;
  try {
    if (err instanceof Error) {
      elsClient.error(err, context);
    } else {
      elsClient.error(String(err), context);
    }
  } catch {
    // fire-and-forget
  }
}
