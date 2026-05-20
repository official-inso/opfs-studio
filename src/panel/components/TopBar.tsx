import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCcw,
  Play,
  Square,
  Save,
  Upload,
  UploadCloud,
  Wand2,
  Palette,
  Github,
} from "lucide-react";
import { useUI } from "../store";
import { CreateFileDialog, CreateDirDialog } from "./Modals";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTheme, setTheme } from "../theme";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackEvent } from "@/analytics";
import { DonateButton } from "./Donate";

export const TopBar: React.FC = () => {
  const send = useUI((s) => s.send);
  const currentPath = useUI((s) => s.currentPath);
  const buffer = useUI((s) => s.buffer);
  const markSaved = useUI((s) => s.markSaved);
  const watching = useUI((s) => s.watching);
  const saveAll = useUI((s) => s.saveAll);
  const uploadFiles = useUI((s) => s.uploadFiles);
  const uploadFolder = useUI((s) => s.uploadFolder);
  const formatOnOpen = useUI((s) => s.formatOnOpen);
  const toggleFormatOnOpen = useUI((s) => s.toggleFormatOnOpen);
  const setWatching = useUI((s) => s.setWatching);

  const filesInput = useRef<HTMLInputElement | null>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);

  const { t } = useTranslation();

  // Theme is applied once in src/panel/index.tsx at boot.
  // Subsequent toggles call setTheme() directly from the Palette button.

  return (
    <div className="border-b bg-background">
      <div className="h-10 px-2 flex items-center gap-1">
        <img
          src="/logo.svg"
          alt="OPFS Studio"
          className="h-5 w-5 mr-1 select-none"
          draggable={false}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                const tabId = useUI.getState().tabId;
                if (tabId != null) {
                  chrome.tabs.reload(tabId).catch(() => void 0);
                  // After reload the content-script needs a moment to (re)inject
                  // itself via the manifest. Probe a list shortly after.
                  window.setTimeout(() => {
                    void send({ kind: "list", data: null }).catch(() => void 0);
                    if (useUI.getState().watching) {
                      void send({ kind: "start-watch", data: null }).catch(() => void 0);
                    }
                  }, 700);
                }
                trackEvent("refresh");
              }}
            >
              <RefreshCcw className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t("topbar.refresh")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={watching ? "default" : "secondary"}
              className={
                watching
                  ? "bg-green-500/20 hover:bg-green-500/50 h-6 w-6 text-green-700"
                  : "h-6 w-6"
              }
              size="icon"
              disabled={watching}
              onClick={() => {
                setWatching(true);
                void send({ kind: "start-watch", data: null });
                trackEvent("startWatch");
              }}
            >
              <Play className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.startWatch")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={
                watching
                  ? "bg-red-500/20 hover:bg-red-500/50 h-6 w-6 text-red-700"
                  : "h-6 w-6"
              }
              disabled={!watching}
              onClick={() => {
                setWatching(false);
                void send({ kind: "stop-watch", data: null });
                trackEvent("stopWatch");
              }}
            >
              <Square className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.stopWatch")}</p>
          </TooltipContent>
        </Tooltip>

        <CreateFileDialog />
        <CreateDirDialog />

        <input
          ref={filesInput}
          type="file"
          multiple
          className="hidden h-6 w-6"
          onChange={(e) => {
            if (e.target.files) void uploadFiles(e.target.files);
            e.currentTarget.value = "";
            trackEvent("uploadFiles");
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                filesInput.current?.click();
              }}
            >
              <Upload className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.uploadFiles")}</p>
          </TooltipContent>
        </Tooltip>

        <input
          ref={folderInput}
          type="file" //@ts-expect-error webkitdirectory
          webkitdirectory="true"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void uploadFolder(e.target.files);
            e.currentTarget.value = "";
            trackEvent("uploadFolder");
          }}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={() => folderInput.current?.click()}
            >
              <UploadCloud className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.uploadFolder")}</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setTheme(getTheme() === "dark" ? "light" : "dark");
                trackEvent("changeTheme", {
                  theme: getTheme() === "dark" ? "light" : "dark",
                });
              }}
            >
              <Palette className="!h-3 !w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("topbar.changeTheme")}</p>
          </TooltipContent>
        </Tooltip>

        {/* <Separator orientation="vertical" className="mx-1 h-6" /> */}

        {/* <Button
          variant={formatOnOpen ? "default" : "secondary"}
          size="icon"
          title={
            formatOnOpen
              ? "Форматировать при открытии: ВКЛ"
              : "Форматировать при открытии: ВЫКЛ"
          }
          onClick={toggleFormatOnOpen}
        >
          <Wand2 className="!h-3 !w-3" />
        </Button> */}

        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const url = new URL("https://9op.ru/000B");
                  const version =
                    chrome.runtime.getManifest?.()?.version ?? "unknown";
                  const surface =
                    (chrome as unknown as { devtools?: unknown }).devtools
                      ? "devtools"
                      : "sidepanel";
                  url.searchParams.set("utm_source", "opfs-studio");
                  url.searchParams.set("utm_medium", "chrome-extension");
                  url.searchParams.set("utm_campaign", "in-app-github");
                  url.searchParams.set("utm_content", "topbar-button");
                  url.searchParams.set("utm_term", surface);
                  url.searchParams.set("ext_version", version);
                  chrome.tabs.create({ url: url.toString() });
                  trackEvent("github_click");
                }}
              >
                <Github className="!h-3 !w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("topbar.github", "GitHub")}</p>
            </TooltipContent>
          </Tooltip>
          <DonateButton />
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-[12px]"
            onClick={() =>
              void saveAll().then(() => {
                toast.success(t("topbar.saveAllSuccess"));
                trackEvent("saveAll");
              })
            }
          >
            {t("topbar.saveAll")}
          </Button>

          <Button
            size="sm"
            disabled={!currentPath}
            className="h-6 px-2 text-[12px]"
            onClick={() => {
              if (!currentPath) return;
              void send({
                kind: "write-file",
                data: {
                  path: currentPath,
                  content: buffer,
                  createIfMissing: true,
                },
              }).then(() => {
                markSaved(currentPath);
                // toast.success(`${t("topbar.saveSuccess")}: ${currentPath}`);
                trackEvent("save");
              });
            }}
          >
            {t("topbar.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};
