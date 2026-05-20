import { useEffect, useState } from "react";
import type {
  MsgFromContent,
  OpfsSnapshot,
  WatchEvent,
} from "../shared/messaging";
import { WelcomeDialog, WELCOME_LS_KEY } from "./components/WelcomeDialog";
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
import { extOf, TEXTUAL_EXT } from "@/shared/text-utils";
import { injectContentScript } from "./lib/inject-content-script";
import { setI18n as setI18nGlobal } from "@/i18n-instance";

type I18nInstance = Awaited<ReturnType<typeof setupI18n>>;

export default function App() {
  const [i18n, setI18n] = useState<I18nInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    trackPage("loaded panel");
  }, []);

  useEffect(() => {
    let mounted = true;
    setupI18n().then((inst) => {
      if (!mounted) return;
      setI18n(inst);
      // also expose to non-React store helpers
      setI18nGlobal(inst);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !i18n) return null;

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
  const tabId = useUI((s) => s.tabId);
  const { t } = useTranslation();
  const [welcomeOpen, setWelcomeOpen] = useState<boolean>(false);

  const onPanelMessage = async (raw: unknown): Promise<void> => {
    const port = raw as { type?: string; tabId?: number };
    if (port.type === "tab:activated") {
      useUI.getState().setActiveTabId(port.tabId ?? null);
      return;
    }

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
      const { path, content, bytes } = msg.data as { path: string; content: string; bytes: string };
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
      state.setStatus({ key: "panel.updatedFromDiskFull", params: { path } });
      useUI.setState({ loading: false });
      return;
    }

    if (msg.kind === "bytes-read") {
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
      const isTextualFile = TEXTUAL_EXT.has(extOf(path));
      if (hasBuf && isTextualFile) {
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
      setStatus({ key: "panel.ready" });
      setTab(null);
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    if (msg.kind === "error") {
      toast.error((msg.data as { message: string }).message);
      return;
    }
  };

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(WELCOME_LS_KEY);
      if (!v) setWelcomeOpen(true);
    } catch {
      setWelcomeOpen(true);
    }
  }, []);

  usePanelPort((m) => {
    void onPanelMessage(m);
  });

  useEffect(() => {
    void useUI.getState().hydrateFromSession();
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
      const tab = tabs[0];
      if (tab?.id != null) {
        setTab(tab.id);
        // Start in sync — the bound tab is the active one on open.
        useUI.getState().setActiveTabId(tab.id);
      }
    });
  }, [setTab]);

  useEffect(() => {
    if (tabId == null) return;
    let cancelled = false;
    void (async () => {
      await injectContentScript(tabId);
      if (cancelled) return;
      await send({ kind: "list", data: null }).catch(() => void 0);
      if (cancelled) return;
      if (useUI.getState().watching) {
        await send({ kind: "start-watch", data: null }).catch(() => void 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tabId, send]);

  useEffect(() => {
    const resync = () => {
      if (useUI.getState().tabId == null) return;
      void send({ kind: "list", data: null }).catch(() => void 0);
      if (useUI.getState().watching)
        void send({ kind: "start-watch", data: null }).catch(() => void 0);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") resync();
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [send]);

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
        <WelcomeDialog
          open={welcomeOpen}
          onOpenChange={setWelcomeOpen}
        />
      </div>
    </TooltipProvider>
  );
}
