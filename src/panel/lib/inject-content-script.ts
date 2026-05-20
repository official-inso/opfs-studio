// CRXJS emits the content script as a standalone IIFE bundle and resolves this
// import to its built filename. Injecting on demand (instead of a declarative
// content_scripts entry matching <all_urls>) lets the extension run with just
// activeTab + scripting, avoiding broad host permissions.
import contentScriptUrl from "@/content/content-entry?script";

/**
 * Try to inject the bundled content-script into the given tab. Requires
 * activeTab access for that tab (granted when the user opens the panel via the
 * toolbar action) or an optional host-permission grant. Safe to call
 * repeatedly — failures (restricted pages, no access, already-injected) are
 * swallowed.
 */
export async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [contentScriptUrl],
      injectImmediately: true,
    });
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Restricted URLs (chrome://, devtools://, webstore), already injected,
    // or no host permission — all of these are expected.
    if (/cannot|access|chrome|restricted|denied|already/i.test(msg)) return false;
    console.warn("[inject-content-script]", msg);
    return false;
  }
}
