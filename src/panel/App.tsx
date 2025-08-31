import { useEffect, useState } from "react";
import type {
  MsgFromContent,
  OpfsSnapshot,
  WatchEvent,
} from "../shared/messaging";
import { usePanelPort } from "./hooks/usePort";
import { useUI } from "./store";
import { FileTree } from "./components/FileTree";
import { TopBar } from "./components/TopBar";
import { EditorPanel } from "./components/EditorPanel";
import { StatusBar } from "./components/StatusBar";
import { toast, Toaster } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { setupI18n } from "@/i18n";
import { I18nextProvider, useTranslation } from "react-i18next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPage } from "@/analytics";

const extOf = (p: string): string => (p.split(".").pop() ?? "").toLowerCase();
const TEXTUAL_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "md",
  "markdown",
  "html",
  "txt",
  "xml",
  "yml",
  "yaml",
  "svg",
  "csv",
  "sql",
  "log",
]);

export default function App() {
  
  const [i18n, setI18n] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    trackPage("loaded panel");
  }, []);

  useEffect(() => {
    setupI18n().then((inst) => {
      setI18n(inst);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <AppContent />
    </I18nextProvider>
  );
}


function AppContent() {

  const setTab = useUI((s) => s.setTab);
  const setWatching = useUI((s) => s.setWatching);
  const applySnapshot = useUI((s) => s.applySnapshot);
  const applyWatchEvents = useUI((s) => s.applyWatchEvents);
  const setStatus = useUI((s) => s.setStatus);
  const setContent = useUI((s) => s.setContent);
  const send = useUI((s) => s.send);
  const watching = useUI((s) => s.watching);
  const stopOpenWatchdog = useUI((s) => s.stopOpenWatchdog);
  const { t } = useTranslation();

  const onPanelMessage = async (raw: unknown): Promise<void> => {
    const msg = raw as MsgFromContent;

    if (msg.kind === "watch-status") {
      setWatching((msg.data as { watching: boolean }).watching);
      return;
    }

    if (msg.kind === "snapshot") {
      applySnapshot(msg.data as OpfsSnapshot);
      return;
    }

    if (msg.kind === "watch-events") {
      applyWatchEvents(msg.data as WatchEvent[]);
      return;
    }

    if (msg.kind === "file-read-start") {
      useUI.setState({ loading: true });
    }

    if (msg.kind === "file-read") {
      stopOpenWatchdog();

      const { path, content, bytes } = msg.data as { path: string; content: string, bytes: string };
      const state = useUI.getState();
      const { awaitingConflictFor, buffers, lastDisk } = state;

      const toLF = (s: string): string => s.replace(/\r\n?/g, "\n");
      const diskLF = toLF(content);
      const currentBuf = buffers[path] ?? "";
      const lastDiskBuf = lastDisk[path] ?? "";

      const hasLocalChanges = currentBuf !== lastDiskBuf;
      const diskChanged = diskLF !== lastDiskBuf;

      if (awaitingConflictFor === path && hasLocalChanges && diskChanged) {
        state.setConflict({ path, diskContent: content });
        return;
      }

      setContent(bytes);
      state.applyDiskContent(path, content);
      state.setStatus(`${t("panel.updatedFromDisk")}: ${path}`);
      useUI.setState({ loading: false });
      return;
    }

    if (msg.kind === "bytes-read") {
      stopOpenWatchdog();
      return;
    }

    if (msg.kind === "remove-result") {
      const { path } = msg.data as { path: string };
      const state = useUI.getState();
      state.removePath(path);

      return;
    }

    if (msg.kind === "write-result") {
      const { path } = msg.data as { path: string };
      const st = useUI.getState();
      const hasBuf = Object.prototype.hasOwnProperty.call(st.buffers, path);
      const isTextual = TEXTUAL_EXT.has(extOf(path));
      if (hasBuf && isTextual) {
        st.markSaved(path);
      }
      toast.success(`${t("panel.saved")}: ${path}`);
      return;
    }

    if (msg.kind === "create-result") {
      toast.success(
        `${t("panel.created")}: ${(msg.data as { path: string }).path}`
      );
      return;
    }

    if (msg.kind === "rename-result") {
      const { from, to } = msg.data as { from: string; to: string };
      toast.success(`${t("panel.renamed")}: ${from} → ${to}`);
      return;
    }

    if (msg.kind === "ready") {
      setStatus(t("panel.ready"));
      setTab(null);
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    if (msg.kind === "error") {
      stopOpenWatchdog();
      toast.error((msg.data as { message: string }).message);
      return;
    }
  };

  usePanelPort((m) => {
    void onPanelMessage(m);
  });

  useEffect(() => {
    const devtoolsTabId =
      (
        chrome as unknown as {
          devtools?: { inspectedWindow?: { tabId: number } };
        }
      ).devtools?.inspectedWindow?.tabId ?? null;
    if (devtoolsTabId != null) {
      setTab(devtoolsTabId);
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0];
      if (t?.id != null) setTab(t.id);
    });
  }, [setTab]);

  useEffect(() => {
    const resync = () => {
      void send({ kind: "list", data: null }).catch(() => void 0);
      if (watching)
        void send({ kind: "start-watch", data: null }).catch(() => void 0);
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resync();
    });
  }, [send, watching]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel minSize={20}>
              <aside className="h-full">
                <div className="h-8 px-2 border-b text-xs flex items-center">
                  {t("panel.tree")}
                </div>
                <FileTree />
              </aside>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel minSize={20} defaultSize={100}>
              <main className="h-full flex-1 min-h-0">
                <EditorPanel />
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <StatusBar />
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  );
}