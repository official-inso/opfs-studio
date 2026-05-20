import React, { useEffect, useMemo, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownViewProps {
  text: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ text }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const fragment = useMemo(() => {
    const raw = marked.parse(text, { async: false }) as string;
    // DOMPurify returns a DocumentFragment when RETURN_DOM_FRAGMENT is set;
    // every dangerous tag/attr is stripped before reaching the DOM.
    return DOMPurify.sanitize(raw, { RETURN_DOM_FRAGMENT: true });
  }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.replaceChildren(fragment.cloneNode(true));
  }, [fragment]);

  return (
    <div className="overflow-auto h-full">
      <div ref={ref} className="markdown-body p-4" />
    </div>
  );
};
