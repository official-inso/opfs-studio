import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { setupI18n } from "@/i18n";
import { I18nextProvider, useTranslation } from "react-i18next";
import { getTheme, setTheme } from "@/panel/theme";
import {
  Moon,
  Sun,
  PanelRight,
  FolderTree,
  FileText,
  HardDrive,
  RefreshCw,
  Heart,
  ExternalLink,
  X,
} from "lucide-react";
import { injectContentScript } from "@/panel/lib/inject-content-script";
import { LanguageSwitcher } from "@/panel/components/LanguageSwitcher";
import { donateConfig, type Region } from "@/donate/providers";
import { trackEvent } from "@/analytics";
import type { MsgFromContent, OpfsFileMeta } from "@/shared/messaging";

type Probe =
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "ok";
      files: number;
      folders: number;
      size: number;
      origin: string | null;
    };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function detectRegion(language: string): Region {
  const l = language.toLowerCase();
  return l.startsWith("ru") || l.startsWith("uk") || l.startsWith("be")
    ? "ru"
    : "global";
}

function PopupBody() {
  const { t, i18n } = useTranslation();
  const [theme, setThemeState] = useState<"light" | "dark">(getTheme());
  const [tabId, setTabId] = useState<number | null>(null);
  const [probe, setProbe] = useState<Probe>({ status: "loading" });
  const [showDonate, setShowDonate] = useState(false);
  const [region, setRegion] = useState<Region>(() =>
    detectRegion(i18n.language)
  );

  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      setTabId(tabs?.[0]?.id ?? null);
    });
  }, []);

  const runProbe = useCallback((id: number | null) => {
    if (id == null) {
      setProbe({ status: "unavailable" });
      return () => {};
    }
    setProbe({ status: "loading" });
    let done = false;
    let port: chrome.runtime.Port | null = null;
    const cleanup = () => {
      try {
        port?.disconnect();
      } catch {
        /* ignore */
      }
    };
    const fail = () => {
      if (done) return;
      done = true;
      cleanup();
      setProbe({ status: "unavailable" });
      trackEvent("opfs_empty");
    };
    const timer = window.setTimeout(fail, 1800);

    void (async () => {
      const injected = await injectContentScript(id);
      if (!injected) {
        window.clearTimeout(timer);
        fail();
        return;
      }
      try {
        port = chrome.runtime.connect({ name: "panel" });
        port.onMessage.addListener((raw: unknown) => {
          const msg = raw as MsgFromContent;
          if (done || msg.kind !== "snapshot" || !msg.data) return;
          const data = msg.data as { files: OpfsFileMeta[]; origin?: string };
          const files = data.files ?? [];
          const fileCount = files.filter((f) => !f.isDirectory).length;
          const folderCount = files.filter((f) => f.isDirectory).length;
          const size = files.reduce(
            (s, f) => s + (f.isDirectory ? 0 : f.size || 0),
            0
          );
          done = true;
          window.clearTimeout(timer);
          cleanup();
          setProbe({
            status: "ok",
            files: fileCount,
            folders: folderCount,
            size,
            origin: data.origin ?? null,
          });
          trackEvent(
            fileCount + folderCount > 0 ? "opfs_detected" : "opfs_empty",
            { count: String(fileCount) }
          );
        });
        chrome.tabs.sendMessage(id, { kind: "list", data: null }, () => {
          void chrome.runtime.lastError;
        });
      } catch {
        window.clearTimeout(timer);
        fail();
      }
    })();

    return () => {
      done = true;
      window.clearTimeout(timer);
      cleanup();
    };
  }, []);

  useEffect(() => runProbe(tabId), [tabId, runProbe]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const openSidePanel = async () => {
    try {
      if (tabId != null && chrome.sidePanel?.open) {
        await chrome.sidePanel.open({ tabId });
        window.close();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const providers = donateConfig.providers.filter(
    (p) => p.region === region || p.region === "both"
  );

  return (
    <div
      className="flex flex-col bg-background text-foreground"
      style={{ width: 360, height: 360, boxSizing: "border-box" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.svg" alt="" style={{ width: 26, height: 26 }} />
          <h1 className="text-base font-semibold truncate">OPFS Studio</h1>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={openSidePanel}
            disabled={tabId == null}
            title={t("popup.openSidePanel", { defaultValue: "Open side panel" })}
            aria-label={t("popup.openSidePanel", {
              defaultValue: "Open side panel",
            })}
          >
            <PanelRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Body (grows; pins the footer to the bottom) */}
      <div className="flex-1 min-h-0 px-4 pt-3 overflow-auto">
        {showDonate ? (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("donate.title", "Support the project")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowDonate(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setRegion("global")}
                className={`px-2 py-1 rounded border ${region === "global" ? "bg-secondary" : ""}`}
              >
                Global
              </button>
              <button
                onClick={() => setRegion("ru")}
                className={`px-2 py-1 rounded border ${region === "ru" ? "bg-secondary" : ""}`}
              >
                {t("donate.russia", "Russia and CIS")}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 overflow-auto">
              {providers.map((p) => (
                <button
                  key={p.id + p.region}
                  onClick={() => {
                    trackEvent("donate_click", { provider: p.id });
                    chrome.tabs?.create({ url: p.url });
                  }}
                  className="w-full text-left border rounded-md p-2 hover:bg-muted transition flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.title}
                    </div>
                    {p.subtitle && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.subtitle}
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-snug mb-3">
              {t("popup.description", {
                defaultValue:
                  "Inspect and edit the Origin Private File System of the current tab.",
              })}
            </p>

            <div className="rounded-md border">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-medium truncate">
                  {probe.status === "ok" && probe.origin
                    ? probe.origin.replace(/^https?:\/\//, "")
                    : t("popup.opfsTitle", { defaultValue: "OPFS on this page" })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => runProbe(tabId)}
                  disabled={probe.status === "loading"}
                  aria-label="Refresh"
                  title={t("popup.refresh", { defaultValue: "Refresh" })}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${probe.status === "loading" ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              <div className="px-3 py-3 text-sm">
                {probe.status === "loading" && (
                  <span className="text-muted-foreground">
                    {t("popup.opfsChecking", { defaultValue: "Checking OPFS…" })}
                  </span>
                )}
                {probe.status === "unavailable" && (
                  <span className="text-muted-foreground">
                    {t("popup.opfsUnavailable", {
                      defaultValue:
                        "OPFS not found / not available on this page",
                    })}
                  </span>
                )}
                {probe.status === "ok" && probe.files + probe.folders === 0 && (
                  <span className="text-muted-foreground">
                    {t("popup.opfsEmpty", { defaultValue: "OPFS is empty" })}
                  </span>
                )}
                {probe.status === "ok" && probe.files + probe.folders > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-4 h-4 opacity-70" />
                      <span className="font-semibold">{probe.files}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("popup.files", { defaultValue: "files" })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <FolderTree className="w-4 h-4 opacity-70" />
                      <span className="font-semibold">{probe.folders}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("popup.folders", { defaultValue: "folders" })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <HardDrive className="w-4 h-4 opacity-70" />
                      <span className="font-semibold">
                        {fmtSize(probe.size)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {t("popup.size", { defaultValue: "size" })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {probe.status === "ok" && probe.files + probe.folders > 0 && (
                <button
                  onClick={openSidePanel}
                  className="w-full border-t px-3 py-2 text-xs text-left hover:bg-muted flex items-center gap-1.5"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                  {t("popup.openToEdit", {
                    defaultValue: "Open side panel to browse & edit",
                  })}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer (pinned to the bottom) */}
      <div className="border-t px-4 py-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex-shrink-0">
          v{chrome.runtime.getManifest?.()?.version ?? "1.0.0"}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowDonate((v) => !v)}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <Heart className="w-3.5 h-3.5" />
            {t("donate.title", { defaultValue: "Support the project" })}
          </button>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}

export default function Popup() {
  const [ready, setReady] = useState(false);
  const [i18n, setI18n] = useState<Awaited<
    ReturnType<typeof setupI18n>
  > | null>(null);

  useEffect(() => {
    let mounted = true;
    setupI18n().then((instance) => {
      if (!mounted) return;
      setI18n(instance);
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !i18n) {
    return (
      <div
        className="flex items-center justify-center bg-background text-foreground"
        style={{ width: 360, height: 360, boxSizing: "border-box" }}
      >
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <PopupBody />
    </I18nextProvider>
  );
}
