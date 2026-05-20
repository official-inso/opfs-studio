import React from "react";
import { useTranslation } from "react-i18next";
import { useUI } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const StatusBar: React.FC = () => {
  const status = useUI((s) => s.statusLine);
  const { t } = useTranslation();
  const text =
    typeof status === "string" ? status : t(status.key, status.params);
  return (
    <div className="h-6 text-xs text-muted-foreground border-t px-2 pr-0 flex items-center justify-between gap-2">
      <span className="truncate">{text}</span>
      <LanguageSwitcher />
    </div>
  );
};
