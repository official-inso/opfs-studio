import React, { useEffect, useMemo, useState } from "react";
import { CodeEditor } from "./Editor";
import { useUI, isTextual } from "../store";
import { ConflictBanner } from "./Conflict";
import { Button } from "@/components/ui/button";

function ext(path: string | null): string {
  return (path?.split(".").pop() ?? "").toLowerCase();
}

export const EditorPanel: React.FC = () => {
  const path = useUI((s) => s.currentPath);
  const buf = useUI((s) => s.buffer);
  const lastDisk = useUI((s) => s.lastDisk);
  const setBuf = useUI((s) => s.setBuffer);
  const send = useUI((s) => s.send);
  const formatOnOpen = useUI((s) => s.formatOnOpen);
  const revertPath = useUI((s) => s.revertPath);
  const setConflict = useUI((s) => s.setConflict);
  

  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const e = ext(path);
  const textual = isTextual(e);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(e);
  const isVideo = ["mp4", "webm", "ogv", "mov"].includes(e);
  const isAudio = ["mp3", "wav", "ogg"].includes(e);
  const isPdf = e === "pdf";

  const dirty = Boolean(path && buf !== (lastDisk[path!] ?? ""));

  useEffect(() => {
    setBlobUrl(null);
    if (!path || textual) return;
    void (async () => {
      const resp = await send<{ ok: true; bytes: ArrayBuffer }>({
        kind: "read-bytes",
        data: { path },
      });
      if (!resp?.bytes) return;
      const type = isImage
        ? e === "svg"
          ? "image/svg+xml"
          : `image/${e === "jpg" ? "jpeg" : e}`
        : isVideo
          ? `video/${e}`
          : isAudio
            ? `audio/${e}`
            : isPdf
              ? "application/pdf"
              : "application/octet-stream";
      const url = URL.createObjectURL(new Blob([resp.bytes], { type }));
      setBlobUrl(url);
    })();
    chrome.runtime.onMessage.addListener(function onMsg(m) {
      if (m?.kind === "bytes-read" && m.data?.path === path) {
        const bytes: ArrayBuffer = m.data.bytes;
        const type = isImage
          ? `image/${e === "jpg" ? "jpeg" : e}`
          : isVideo
            ? `video/${e}`
            : isAudio
              ? `audio/${e}`
              : isPdf
                ? "application/pdf"
                : "application/octet-stream";
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        setBlobUrl(url);
        chrome.runtime.onMessage.removeListener(onMsg);
      }
      return false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, textual]);

  useEffect(
    () => () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    [blobUrl]
  );

  if (!path)
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        — выберите файл —
      </div>
    );

  if (textual) {
    return (
      <div className="flex flex-col min-h-0 h-full">
        <div className="h-8 px-2 border-b text-xs flex items-center gap-2">
          <span className="truncate">{path}</span>
          <div className="ml-auto flex items-center gap-2">
            {dirty && (
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[11px]"
                onClick={() => {
                  if (path) {
                    revertPath(path);
                    setConflict(null);
                  }
                }}
                title="Откатить несохранённые правки к последней версии с диска"
              >
                Откатить изменения
              </Button>
            )}
          </div>
        </div>
        <ConflictBanner />
        <div className="flex-1 min-h-0">
          <CodeEditor
            path={path}
            value={buf}
            onChange={setBuf}
            formatOnOpen={formatOnOpen}
          />
        </div>
      </div>
    );
  }

  if (isImage && blobUrl)
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <img
          src={blobUrl}
          alt={path}
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      </div>
    );
  if (isVideo && blobUrl)
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <video
          src={blobUrl}
          controls
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      </div>
    );
  if (isAudio && blobUrl)
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <audio src={blobUrl} controls style={{ width: "100%" }} />
      </div>
    );
  if (isPdf && blobUrl)
    return <iframe className="w-full h-full" src={blobUrl} title={path} />;

  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Этот тип пока не поддерживается для предпросмотра.
    </div>
  );
};
