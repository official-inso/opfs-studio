import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage may be blocked
  }
  try {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  } catch {
    // monaco not yet loaded — safe to ignore
  }
}

export function applySystemTheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  setTheme(mq.matches ? "dark" : "light");
  mq.addEventListener("change", (e) => setTheme(e.matches ? "dark" : "light"));
}
