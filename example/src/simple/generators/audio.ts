/**
 * Generate a 1-second PCM-16 mono WAV file with a 440Hz sine wave.
 * No Web Audio API, no decoding — pure byte writing.
 */
export function wavSine(
  durationSec = 1,
  freq = 440,
  sampleRate = 44100,
): Uint8Array {
  const samples = Math.floor(durationSec * sampleRate);
  const byteRate = sampleRate * 2;
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // samples
  const omega = (2 * Math.PI * freq) / sampleRate;
  for (let i = 0; i < samples; i++) {
    const v = Math.sin(omega * i) * 0.4; // -0.4..0.4 to avoid clipping
    const s = Math.max(-1, Math.min(1, v));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
