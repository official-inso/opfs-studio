import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ElsBoundary } from "../els/ElsBoundary";
import "./styles.css";

import { applySystemTheme, setTheme, watchThemeSync } from "./theme";

(() => {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem("theme");
  } catch {
    stored = null;
  }
  if (stored === "light" || stored === "dark") setTheme(stored);
  else applySystemTheme();
})();

watchThemeSync();

const container = document.getElementById("root");
if (!container) throw new Error("root not found");
createRoot(container).render(
  <ElsBoundary>
    <App />
  </ElsBoundary>
);
