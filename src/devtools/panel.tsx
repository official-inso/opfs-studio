import React from "react";
import { createRoot } from "react-dom/client";
import App from "../panel/App";
import { ElsBoundary } from "../els/ElsBoundary";
import "../panel/styles.css";
import { useUI } from "../panel/store";

const devtools = (
  chrome as unknown as { devtools?: { inspectedWindow?: { tabId: number } } }
).devtools;
const inspectedTabId = devtools?.inspectedWindow?.tabId ?? null;

if (inspectedTabId != null) {
  useUI.getState().setTab(inspectedTabId);
  void useUI
    .getState()
    .send({ kind: "list", data: null })
    .catch(() => void 0);
  void useUI
    .getState()
    .send({ kind: "start-watch", data: null })
    .catch(() => void 0);
}


const container = document.getElementById("root");
if (!container) throw new Error("root not found");
createRoot(container).render(
  <ElsBoundary>
    <App />
  </ElsBoundary>
);
