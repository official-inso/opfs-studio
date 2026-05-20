/**
 * Generate a minimal valid PDF 1.4 single-page document with one text line.
 * The output is ~600 bytes and opens correctly in Chrome, Firefox, Edge.
 */
export function pdfSample(text = "OPFS Studio · sample PDF"): Uint8Array {
  const enc = new TextEncoder();
  const lines: Uint8Array[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const push = (s: string): void => {
    const bytes = enc.encode(s);
    lines.push(bytes);
    cursor += bytes.byteLength;
  };

  // Header
  push("%PDF-1.4\n%âãÏÓ\n");

  // 1: Catalog
  offsets[1] = cursor;
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: Pages
  offsets[2] = cursor;
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // 3: Page
  offsets[3] = cursor;
  push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );

  // 4: Contents stream
  const escaped = text.replace(/[()\\]/g, (m) => `\\${m}`);
  const stream =
    `BT\n/F1 24 Tf\n72 770 Td\n(${escaped}) Tj\nET\n`;
  offsets[4] = cursor;
  push(
    `4 0 obj\n<< /Length ${enc.encode(stream).byteLength} >>\nstream\n${stream}endstream\nendobj\n`,
  );

  // 5: Font
  offsets[5] = cursor;
  push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  // xref
  const xrefOffset = cursor;
  push("xref\n0 6\n");
  push("0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  // trailer
  push(
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  // Concatenate
  const out = new Uint8Array(cursor);
  let off = 0;
  for (const chunk of lines) {
    out.set(chunk, off);
    off += chunk.byteLength;
  }
  return out;
}
