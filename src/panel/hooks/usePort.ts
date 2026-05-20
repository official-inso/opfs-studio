import { useEffect, useRef } from "react";

export function usePanelPort(
  onMessage: (msg: unknown) => void
): chrome.runtime.Port {
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  if (!portRef.current) {
    portRef.current = chrome.runtime.connect({ name: "panel" });
  }

  useEffect(() => {
    const port = portRef.current!;
    const listener = (msg: unknown) => handlerRef.current(msg);
    port.onMessage.addListener(listener);
    return () => {
      try {
        port.onMessage.removeListener(listener);
        port.disconnect();
      } catch {
        // port already disconnected
      }
      portRef.current = null;
    };
  }, []);

  return portRef.current!;
}
