export function abToBase64(ab: ArrayBuffer): string {
  const u8 = new Uint8Array(ab);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    bin += String.fromCharCode(...u8.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function base64ToUint8Local(b64: string): Uint8Array {
  // поддержка без префиксов data: и с ними
  const clean = b64.includes(",") ? b64.split(",").pop()! : b64;
  const pad =
    clean.length % 4 === 0 ? clean : clean + "=".repeat(4 - (clean.length % 4));
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function base64ToBlob(b64: string, type = "application/octet-stream"): Blob {
  const bytes = base64ToUint8Local(b64);
  return new Blob([bytes.buffer as ArrayBuffer], { type });
}