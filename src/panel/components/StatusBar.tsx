import React from "react";
import { useUI } from "../store";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const StatusBar: React.FC = () => {
  const text = useUI((s) => s.statusLine);
  return (
    <div className="h-6 text-xs text-muted-foreground border-t px-2 pr-0 flex items-center justify-between gap-2">
      {text}
      <LanguageSwitcher />
    </div>
  );
};
