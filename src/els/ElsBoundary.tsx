import React from "react";
import { elsError } from "./client";

/**
 * Top-level wrapper for every React surface (panel, popup, devtools).
 *
 * - Catches render-phase crashes and reports them to ELS (source:"client",
 *   with stacktrace + componentStack) instead of showing a blank screen.
 * - Installs global window.onerror / unhandledrejection handlers that report
 *   to ELS as well.
 *
 * All reporting goes through `elsError`, which is a no-op when ELS is disabled
 * (build without the API key), so the extension works fine without it.
 *
 * The fallback lives ABOVE the i18n provider, so it uses neutral bilingual text.
 */

function Fallback(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        height: "100vh",
        padding: 24,
        textAlign: "center",
        font: "14px/1.5 system-ui, sans-serif",
        color: "inherit",
      }}
    >
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div>Something went wrong · Произошла ошибка</div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          padding: "6px 14px",
          borderRadius: 6,
          border: "1px solid currentColor",
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        Reload · Перезагрузить
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    elsError(error, "render", info?.componentStack ?? undefined);
  }

  render(): React.ReactNode {
    return this.state.error ? <Fallback /> : this.props.children;
  }
}

function useGlobalErrorReporting(): void {
  React.useEffect(() => {
    const onError = (e: ErrorEvent) => {
      elsError(e.error ?? e.message, "window.onerror");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      elsError(e.reason, "unhandledrejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}

function GlobalErrorReporter(): null {
  useGlobalErrorReporting();
  return null;
}

export function ElsBoundary({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ErrorBoundary>
      <GlobalErrorReporter />
      {children}
    </ErrorBoundary>
  );
}
