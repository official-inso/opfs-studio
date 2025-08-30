import React, { useEffect, useState } from "react";
import { AlertTriangle, GitBranch, GitMerge, ReplaceAll } from "lucide-react";
import { useUI } from "../store";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const toLF = (s: string): string => s.replace(/\r\n?/g, "\n");

export const ConflictBanner: React.FC = () => {
  const conflict = useUI((s) => s.conflict);
  const setConflict = useUI((s) => s.setConflict);
  const setBufferForPath = useUI((s) => s.setBufferForPath);
  const currentPath = useUI((s) => s.currentPath);
  const buffer = useUI((s) => s.buffer);
  const send = useUI((s) => s.send);
  const markSaved = useUI((s) => s.markSaved);

  const [open, setOpen] = useState(false);

  const { t } = useTranslation();

  if (!conflict || !currentPath || conflict.path !== currentPath) return null;

  async function handleReplace(): Promise<void> {
    if (!currentPath || !conflict) return;
    setBufferForPath(
      currentPath ?? "",
      toLF(conflict ? conflict.diskContent : ""),
      false
    );
    setConflict(null);
    markSaved(currentPath ?? "");
  }

  async function handleMergeApply(merged: string): Promise<void> {
    if (!currentPath) return;
    await send({
      kind: "write-file",
      data: { path: currentPath ?? "", content: merged, createIfMissing: true },
    });
    setBufferForPath(currentPath?? "", merged, false);
    markSaved(currentPath?? "");
    setConflict(null);
  }

  return (
    <div className="py-2 bg-orange-700 text-amber-50 text-sm border-b border-amber-700 pr-2 pl-3 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-shrink-0">{t("conflict.Thefileischangedoutside")}</div>
      <div className="ml-auto flex items-center justify-end gap-2 flex-wrap">
        <Button
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-[11px] gap-2 flex items-center"
          onClick={() => setOpen(true)}
        >
          <GitMerge className="h-3.5 w-3.5" />
          <div>{t("conflict.Smerdzhit")}</div>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-6 px-2 text-[11px] gap-2 flex items-center"
          onClick={() => {
            void handleReplace();
          }}
        >
          <ReplaceAll className="h-3.5 w-3.5" />
          <div>{t("conflict.Replacethecontentsofthedisk")}</div>
        </Button>
        <Button
          size="sm"
          className="h-6 px-2 text-[11px] gap-2 flex items-center"
          onClick={() => {
            setConflict(null);
          }}
        >
          <GitBranch className="h-3.5 w-3.5" />
          <div>{t("conflict.Leavemyedits")}</div>
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[700px] !max-w-[700px] h-[70vh] !min-w-[300px]">
          <DialogHeader>
            <DialogTitle>{t("conflict.Mergingchanges")}</DialogTitle>
          </DialogHeader>
          <DiffEditor
            right={toLF(conflict.diskContent)}
            left={buffer}
            onApply={(merged) => {
              void handleMergeApply(merged);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DiffEditor: React.FC<{
  left: string;
  right: string;
  onApply: (merged: string) => void;
}> = ({ left, right, onApply }) => {
  const host = React.useRef<HTMLDivElement | null>(null);
  const diffRef = React.useRef<monaco.editor.IStandaloneDiffEditor | null>(
    null
  );

  const { t } = useTranslation();

  useEffect(() => {
    if (!host.current) return;
    const original = monaco.editor.createModel(left, "plaintext");
    const modified = monaco.editor.createModel(right, "plaintext");
    const editor = monaco.editor.createDiffEditor(host.current, {
      theme: "vs-dark",
      readOnly: false,
      renderSideBySide: true,
      enableSplitViewResizing: true,
    });
    editor.setModel({ original, modified });
    diffRef.current = editor;

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (!host.current) return;
        editor.layout({
          width: host.current.clientWidth,
          height: host.current.clientHeight,
        });
      });
    });
    ro.observe(host.current);

    return () => {
      ro.disconnect();
      editor.dispose();
      original.dispose();
      modified.dispose();
    };
  }, [left, right]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1" ref={host} />
      <div className="mt-2 flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            const merged =
              diffRef.current?.getModel()?.modified.getValue() ?? right;
            onApply(merged);
          }}
        >
          {t("conflict.Applyunited")}
        </Button>
      </div>
    </div>
  );
};
