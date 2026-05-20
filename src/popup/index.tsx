import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./Popup";
import { ElsBoundary } from "../els/ElsBoundary";
import "../panel/styles.css";
import { applySystemTheme, applyTheme, watchThemeSync } from "../panel/theme";

(() => {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem("theme");
  } catch {
    stored = null;
  }
  if (stored === "light" || stored === "dark") applyTheme(stored);
  else applySystemTheme();
})();

watchThemeSync();

const container = document.getElementById("root");
if (!container) throw new Error("root not found");
createRoot(container).render(
  <ElsBoundary>
    <Popup />
  </ElsBoundary>
);
