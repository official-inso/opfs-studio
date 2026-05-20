import React from "react";
import { ELSProvider, ELSErrorBoundary } from "@inso_web/els-react";
import { elsConfig, elsError } from "./client";

/**
 * Top-level wrapper for every React surface (panel, popup, devtools).
 *
 * - When ELS is configured (build with endpoint+key): wraps children in
 *   <ELSProvider> (captureGlobalErrors → window.onerror + unhandledrejection)
 *   and <ELSErrorBoundary> so render-phase crashes are reported with stacktrace.
 * - When ELS is disabled: still wraps children in a local error boundary so a
 *   crash shows a fallback instead of a blank screen.
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

/** Minimal error boundary used when ELS is not configured. */
class LocalErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // No-op when ELS disabled; kept for symmetry / future local logging.
    elsError(error, "render");
  }

  render(): React.ReactNode {
    return this.state.error ? <Fallback /> : this.props.children;
  }
}

export function ElsBoundary({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  if (!elsConfig) {
    return <LocalErrorBoundary>{children}</LocalErrorBoundary>;
  }
  return (
    <ELSProvider config={elsConfig} captureGlobalErrors>
      <ELSErrorBoundary fallback={<Fallback />}>{children}</ELSErrorBoundary>
    </ELSProvider>
  );
}
