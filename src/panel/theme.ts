import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Apply the theme to THIS document only (no persistence). */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  } catch {
    // monaco not yet loaded — safe to ignore
  }
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage may be blocked
  }
  // Persist to chrome.storage.sync so every surface (popup, side panel,
  // devtools) can pick up the change live via the listener below.
  try {
    void chrome.storage?.sync?.set?.({ theme });
  } catch {
    // storage unavailable
  }
}

let themeSyncBound = false;
/**
 * Listen for theme changes made in another surface and apply them here.
 * Idempotent — safe to call from each entry point.
 */
export function watchThemeSync(): void {
  if (themeSyncBound) return;
  themeSyncBound = true;
  try {
    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area !== "sync") return;
      const c = changes["theme"];
      if (!c) return;
      const next = c.newValue === "dark" ? "dark" : "light";
      if (next === getTheme()) return;
      applyTheme(next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        // ignore
      }
    });
  } catch {
    // storage events unavailable
  }
}

export function applySystemTheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  setTheme(mq.matches ? "dark" : "light");
  mq.addEventListener("change", (e) => setTheme(e.matches ? "dark" : "light"));
}
