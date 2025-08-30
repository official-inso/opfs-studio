import type { MsgFromContent } from "../shared/messaging";

// ретрансляция событий всем панелям
const panelPorts = new Set<chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "panel") {
    panelPorts.add(port);
    port.onDisconnect.addListener(() => panelPorts.delete(port));
  }
});

// Если вкладка перезагрузилась — уведомляем соответствующую панель
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    for (const p of panelPorts) {
      // p.sender?.tab?.id есть у side panel и devtools панели
      if (p.sender?.tab?.id === tabId) {
        try {
          p.postMessage({ type: "tab:reloaded", tabId });
        } catch {
          // ignore
        }
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
  if (sender.tab?.id != null) {
    broadcast(msg);
  }
  // no direct sendResponse
  return false;
});

// Инициация сайд-панели из action (по иконке)
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
