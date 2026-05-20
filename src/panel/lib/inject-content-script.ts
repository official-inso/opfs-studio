/**
 * Try to inject the bundled content-script into a tab that was loaded before
 * the extension became active. Safe to call repeatedly — failures (restricted
 * pages, already-injected scripts) are swallowed.
 */
export async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    const manifest = chrome.runtime.getManifest();
    const file = manifest.content_scripts?.[0]?.js?.[0];
    if (!file) return false;
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [file],
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
