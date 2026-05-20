import React, { useEffect, useMemo, useRef } from "react";
import DOMPurify from "dompurify";
import { useTranslation } from "react-i18next";

interface SvgPreviewProps {
  text: string;
}

function isLikelySvg(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /<svg[\s>]/i.test(trimmed);
}

export const SvgPreview: React.FC<SvgPreviewProps> = ({ text }) => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);

  const valid = useMemo(() => isLikelySvg(text), [text]);

  const fragment = useMemo(() => {
    if (!valid) return null;
    return DOMPurify.sanitize(text, {
      USE_PROFILES: { svg: true, svgFilters: true },
      RETURN_DOM_FRAGMENT: true,
    });
  }, [text, valid]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!fragment) {
      el.replaceChildren();
      return;
    }
    el.replaceChildren(fragment.cloneNode(true));
  }, [fragment]);

  if (!valid) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
        {t("editor.svgInvalid", "Not a valid SVG document")}
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto flex items-center justify-center svg-checker-bg"
    >
      <div ref={ref} className="max-w-full max-h-full p-4" />
    </div>
  );
};
