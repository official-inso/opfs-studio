import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./Popup";
import { ElsBoundary } from "../els/ElsBoundary";
import "../panel/styles.css";
import { applySystemTheme } from "../panel/theme";

applySystemTheme();

const container = document.getElementById("root");
if (!container) throw new Error("root not found");
createRoot(container).render(
  <ElsBoundary>
    <Popup />
  </ElsBoundary>
);
