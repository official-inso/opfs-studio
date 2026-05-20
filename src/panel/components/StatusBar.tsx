import React from "react";
import { useTranslation } from "react-i18next";
import { useUI } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AlertTriangle, MonitorSmartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const isDevtools = Boolean(
  (chrome as unknown as { devtools?: unknown }).devtools
);

export const StatusBar: React.FC = () => {
  const status = useUI((s) => s.statusLine);
  const boundOrigin = useUI((s) => s.boundOrigin);
  const tabId = useUI((s) => s.tabId);
  const activeTabId = useUI((s) => s.activeTabId);
  const switchToBoundTab = useUI((s) => s.switchToBoundTab);
  const { t } = useTranslation();

  const text =
    typeof status === "string" ? status : t(status.key, status.params);

  const mismatch =
    !isDevtools &&
    activeTabId != null &&
    tabId != null &&
    activeTabId !== tabId;

  const host = boundOrigin ? boundOrigin.replace(/^https?:\/\//, "") : null;

  const tip = mismatch
    ? t("status.tabMismatch", "This editor is bound to {{host}} — click to switch back", { host: host ?? "" })
    : t("status.boundTo", "Bound to {{host}}", { host: host ?? "" });

  return (
    <div className="h-6 text-xs text-muted-foreground border-t px-2 pr-0 flex items-center justify-between gap-2">
      <span className="truncate flex-shrink min-w-0">{text}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {host && (
          <Tooltip>
            <TooltipTrigger asChild>
              {isDevtools ? (
                <span
                  className="flex items-center gap-1 max-w-[180px] cursor-default"
                >
                  <MonitorSmartphone className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{host}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={switchToBoundTab}
                  className={`flex items-center gap-1 max-w-[180px] hover:underline ${
                    mismatch
                      ? "text-amber-600 dark:text-amber-400"
                      : "hover:text-foreground"
                  }`}
                >
                  {mismatch ? (
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <MonitorSmartphone className="h-3 w-3 flex-shrink-0" />
                  )}
                  <span className="truncate">{host}</span>
                </button>
              )}
            </TooltipTrigger>
            <TooltipContent side="top" align="end">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
        <LanguageSwitcher />
      </div>
    </div>
  );
};
