import React from "react";
import { useUI } from "../store";

export const StatusBar: React.FC = () => {
  const text = useUI((s) => s.statusLine);
  return (
    <div className="h-6 text-xs text-muted-foreground border-t px-2 flex items-center">
      {text}
    </div>
  );
};
