import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "../monacoSetup";
import { getTheme } from "../theme";

export interface EditorProps {
  path: string | null;
  value: string;
  onChange: (next: string) => void;
  /** Если true — при открытии/смене файла выполняется автоформат документа */
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

  // mount once
  useEffect(() => {
    if (!hostRef.current) return;

    const lang = langByPath(path);

    const uri = monaco.Uri.parse(`inmemory://${path ?? "untitled"}`);
    const model = monaco.editor.createModel(value, lang, uri);
    model.setEOL(monaco.editor.EndOfLineSequence.LF);
    modelRef.current = model;

    const editor = monaco.editor.create(hostRef.current, {
      model,
      theme: getTheme() === "dark" ? "vs-dark" : "vs-light",
      automaticLayout: false, // используем свой ResizeObserver
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

    // формат на старте (если разрешён и действие поддерживается)
    if (formatOnOpen) {
      // даём кадр на инициализацию
      setTimeout(() => runFormat(editor), 0);
    }

    // собственный observer с rAF, чтобы DevTools не ругался
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
      resizeObs.current?.disconnect();
      editor.dispose();
      model.dispose();
      editorRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // external value update (без лишних курсор-скачков)
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

  // language & formatting on path change
  useEffect(() => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model) return;

    monaco.editor.setModelLanguage(model, langByPath(path));

    model.setEOL(monaco.editor.EndOfLineSequence.LF); // или CRLF

    if (formatOnOpen) {
      setTimeout(() => runFormat(ed), 0);
    }
  }, [path, formatOnOpen]);

  return <div className="h-full" ref={hostRef} />;
};
