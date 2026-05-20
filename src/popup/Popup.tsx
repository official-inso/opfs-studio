import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { setupI18n } from "@/i18n";
import { I18nextProvider, useTranslation } from "react-i18next";
import { getTheme, setTheme } from "@/panel/theme";
import { Moon, Sun, PanelRight, Heart, Code2 } from "lucide-react";

function PopupBody() {
  const { t } = useTranslation();
  const [theme, setThemeState] = useState<"light" | "dark">(getTheme());
  const [tabId, setTabId] = useState<number | null>(null);

  useEffect(() => {
    chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
      const id = tabs?.[0]?.id ?? null;
      setTabId(id);
    });
  }, []);

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

  const openDevtoolsHint = () => {
    const msg = t("popup.devtoolsHint", {
      defaultValue:
        "Open DevTools (F12 / Cmd+Option+I) and select the 'OPFS Studio' tab.",
    });
    alert(msg);
  };

  return (
    <div
      className="p-4 flex flex-col gap-3 bg-background text-foreground"
      style={{ width: 360, minHeight: 220, boxSizing: "border-box" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" style={{ width: 28, height: 28 }} />
          <h1 className="text-base font-semibold">OPFS Studio</h1>
        </div>
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

      <p className="text-xs text-muted-foreground leading-snug">
        {t("popup.description", {
          defaultValue:
            "Inspect and edit the Origin Private File System of the current tab.",
        })}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          onClick={openSidePanel}
          disabled={tabId == null}
          className="w-full justify-start"
        >
          <PanelRight className="w-4 h-4 mr-2" />
          {t("popup.openSidePanel", { defaultValue: "Open Side Panel" })}
        </Button>

        <Button
          variant="outline"
          onClick={openDevtoolsHint}
          className="w-full justify-start"
        >
          <Code2 className="w-4 h-4 mr-2" />
          {t("popup.openDevTools", { defaultValue: "Open in DevTools" })}
        </Button>
      </div>

      <div className="border-t pt-2 mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>v{chrome.runtime.getManifest?.()?.version ?? "1.0.0"}</span>
        <a
          href="https://github.com/sponsors"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            chrome.tabs?.create({ url: "https://github.com/sponsors" });
          }}
        >
          <Heart className="w-3 h-3" />
          {t("popup.donate", { defaultValue: "Donate" })}
        </a>
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
        style={{ width: 360, height: 220, boxSizing: "border-box" }}
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
