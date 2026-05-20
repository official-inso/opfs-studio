import type { MsgFromContent } from "../shared/messaging";
import { trackPage } from "@/analytics";

interface PanelPort extends chrome.runtime.Port {
  isDevtools: boolean;
}

const panelPorts = new Set<PanelPort>();

const BROADCAST_KINDS: ReadonlySet<MsgFromContent["kind"]> = new Set<
  MsgFromContent["kind"]
>([
  "ready",
  "watch-status",
  "snapshot",
  "watch-events",
  "file-read",
  "file-read-start",
  "bytes-read",
  "write-result",
  "create-result",
  "rename-result",
  "remove-result",
  "error",
]);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "panel") return;
  const isDevtools = Boolean(port.sender?.url?.includes("devtools.html"));
  const typed = port as PanelPort;
  typed.isDevtools = isDevtools;

  panelPorts.add(typed);
  port.onDisconnect.addListener(() => panelPorts.delete(typed));
});

chrome.runtime.onInstalled.addListener(() => {
  trackPage("extension_installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;
  for (const p of panelPorts) {
    if (p.isDevtools) continue;
    if (p.sender?.tab?.id === tabId) {
      try {
        p.postMessage({ type: "tab:reloaded", tabId });
      } catch {
        // ignore
      }
    }
  }
});

function broadcast(msg: MsgFromContent): void {
  for (const p of panelPorts) {
    try {
      p.postMessage(msg);
    } catch {
      // ignore
    }
  }
}

chrome.runtime.onMessage.addListener((msg: MsgFromContent, sender) => {
  if (msg.kind === "open-panel") {
    trackPage("panel_opened");
    return false;
  }
  if (sender.tab?.id == null) return false;
  if (!BROADCAST_KINDS.has(msg.kind)) return false;
  broadcast(msg);
  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "src/panel/index.html",
      enabled: true,
    });
  }
});
