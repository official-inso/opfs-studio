import { useEffect, useRef } from "react";

export function usePanelPort(
  onMessage: (msg: unknown) => void
): chrome.runtime.Port {
  const portRef = useRef<chrome.runtime.Port | null>(null);

  if (!portRef.current) {
    portRef.current = chrome.runtime.connect({ name: "panel" });
    portRef.current.onMessage.addListener(onMessage);
  }

  useEffect(() => {
    const p = portRef.current!;
    return () => {
      p.disconnect();
    };
  }, []);

  return portRef.current!;
}
