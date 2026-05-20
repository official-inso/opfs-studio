import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "../monacoSetup";
import { loadUIState, saveUIState } from "../lib/session-state";

export interface EditorProps {
  path: string | null;
  value: string;
  onChange: (next: string) => void;
  formatOnOpen?: boolean;
}

function langByPath(path: string | null): string {
  if (!path) return "plaintext";
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "md":
    case "markdown":
      return "markdown";
    case "html":
      return "html";
    case "xml":
    case "svg":
      return "xml";
    case "yml":
    case "yaml":
      return "yaml";
    case "sql":
      return "sql";
    case "py":
    case "pyw":
      return "python";
    case "php":
      return "php";
    case "rb":
      return "ruby";
    case "go":
      return "go";
    case "java":
      return "java";
    case "cs":
    case "csx":
      return "csharp";
    case "c":
    case "h":
    case "cc":
    case "cxx":
    case "cpp":
    case "hpp":
    case "hh":
      return "cpp";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "ini":
    case "conf":
    case "cfg":
      return "ini";
    case "gql":
    case "graphql":
      return "graphql";
    case "dockerfile":
    case "containerfile":
      return "dockerfile";

    // текстовые по умолчанию
    case "txt":
    case "log":
    case "ini-example":
      return "plaintext";
    default:
      return "plaintext";
  }
}

function runFormat(editor: monaco.editor.IStandaloneCodeEditor): void {
  const action = editor.getAction("editor.action.formatDocument");
  if (action && action.isSupported()) {
    void action.run();
  }
}

export const CodeEditor: React.FC<EditorProps> = ({
  path,
  value,
  onChange,
  formatOnOpen = false,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const resizeObs = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const lang = langByPath(path);

    const uri = monaco.Uri.parse(`inmemory://${path ?? "untitled"}`);
    const model = monaco.editor.createModel(value, lang, uri);
    model.setEOL(monaco.editor.EndOfLineSequence.LF);
    modelRef.current = model;

    const editor = monaco.editor.create(hostRef.current, {
      model,
      automaticLayout: false,
      minimap: { enabled: true },
      wordWrap: "on",
      fontSize: 13,
      scrollBeyondLastLine: false,
      stickyScroll: { enabled: true },
      folding: true,
      codeLens: true,
      smoothScrolling: true,
      links: true,
    });
    editorRef.current = editor;

    const sub = editor.onDidChangeModelContent(() => {
      const textForSave = editor
        .getModel()!
        .getValue(monaco.editor.EndOfLinePreference.LF);
      onChange(textForSave);
    });

    // Restore cursor + scroll position for this path
    if (path) {
      void loadUIState().then((state) => {
        const pos = state.cursorByPath?.[path];
        if (!pos || !editorRef.current) return;
        editorRef.current.setPosition({
          lineNumber: pos.line,
          column: pos.column,
        });
        if (typeof pos.scrollTop === "number") {
          editorRef.current.setScrollTop(pos.scrollTop);
        }
        editorRef.current.revealPositionInCenterIfOutsideViewport(
          { lineNumber: pos.line, column: pos.column },
          monaco.editor.ScrollType.Immediate,
        );
      });
    }

    const persistCursor = () => {
      if (!path || !editorRef.current) return;
      const p = editorRef.current.getPosition();
      const scrollTop = editorRef.current.getScrollTop();
      if (!p) return;
      saveUIState({
        cursorByPath: {
          [path]: { line: p.lineNumber, column: p.column, scrollTop },
        },
      });
    };
    const cursorSub = editor.onDidChangeCursorPosition(persistCursor);
    const scrollSub = editor.onDidScrollChange(persistCursor);

    if (formatOnOpen) {
      setTimeout(() => runFormat(editor), 0);
    }

    resizeObs.current = new ResizeObserver(() => {
      const ed = editorRef.current;
      if (!ed) return;
      window.requestAnimationFrame(() => {
        const host = hostRef.current;
        if (!host) return;
        ed.layout({ width: host.clientWidth, height: host.clientHeight });
      });
    });
    resizeObs.current.observe(hostRef.current);

    return () => {
      sub.dispose();
      cursorSub.dispose();
      scrollSub.dispose();
      resizeObs.current?.disconnect();
      editor.dispose();
      model.dispose();
      editorRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    const lang = langByPath(path);
    if (!ed || !model) return;
    if (ed.getValue() !== value) {
      // заменяем весь текст одним патчем
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: value }],
        () => null
      );
    }
  }, [value, path]);

  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model) return;

    monaco.editor.setModelLanguage(model, langByPath(path));

    model.setEOL(monaco.editor.EndOfLineSequence.LF);

    if (formatOnOpen) {
      setTimeout(() => runFormat(ed), 0);
    }
  }, [path, formatOnOpen]);

  return <div className="h-full" ref={hostRef} />;
};
