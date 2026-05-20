export function svgGradient(): string {
  const ts = new Date().toISOString().slice(0, 19);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4dd0e1"/>
      <stop offset="100%" stop-color="#5c6bc0"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="middle"
        font-family="monospace" font-size="14" fill="white">OPFS</text>
  <text x="100" y="160" text-anchor="middle" font-family="monospace"
        font-size="9" fill="rgba(255,255,255,0.7)">${ts}</text>
</svg>
`;
}

export async function pngGradient(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const grad = ctx.createLinearGradient(0, 0, 200, 200);
  grad.addColorStop(0, "#4dd0e1");
  grad.addColorStop(1, "#5c6bc0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 200, 200);

  ctx.fillStyle = "white";
  ctx.font = "bold 28px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("OPFS", 100, 100);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "10px ui-monospace, monospace";
  ctx.fillText(new Date().toISOString().slice(0, 19), 100, 175);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob returned null"))),
      "image/png",
    );
  });
}
