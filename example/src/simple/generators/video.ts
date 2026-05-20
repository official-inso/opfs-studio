/**
 * Render a 2-second gradient animation on a canvas and capture it as WebM
 * via MediaRecorder + captureStream.
 *
 * Returns `null` if the browser doesn't support any WebM codec we know.
 */
export async function webmGradient(durationMs = 2000): Promise<Blob | null> {
  const mime = pickMimeType();
  if (!mime) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const fps = 30;
  type CanvasWithStream = HTMLCanvasElement & {
    captureStream: (fps: number) => MediaStream;
  };
  const stream = (canvas as CanvasWithStream).captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const draw = (now: number) => {
      const t = (now - start) / durationMs;
      if (t >= 1) {
        resolve();
        return;
      }
      const hue = (t * 360) | 0;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, `hsl(${hue}, 70%, 55%)`);
      grad.addColorStop(1, `hsl(${(hue + 90) % 360}, 70%, 35%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "bold 24px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("OPFS", canvas.width / 2, canvas.height / 2);
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  recorder.stop();
  stream.getTracks().forEach((tr) => tr.stop());
  await stopped;
  return new Blob(chunks, { type: mime });
}

function pickMimeType(): string | null {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return null;
}
