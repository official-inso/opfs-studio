import { ensureDirPath, writeToOpfs, type WriteData } from "./writer";
import { csvBody, jsonBody, mdBody, txtBody } from "./generators/text";
import { pngGradient, svgGradient } from "./generators/image";
import { wavSine } from "./generators/audio";
import { webmGradient } from "./generators/video";
import { pdfSample } from "./generators/pdf";
import { buildDemoTree, type TreeReport } from "./generators/tree";

export type PresetKind = "dir" | "file" | "tree";

export interface PresetResult {
  path?: string;
  size?: number;
  tree?: TreeReport;
  message?: string;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  kind: PresetKind;
  run(): Promise<PresetResult>;
}

async function writeFile(path: string, data: WriteData): Promise<PresetResult> {
  const res = await writeToOpfs(path, data);
  return { path: res.path, size: res.size };
}

export const PRESETS: Preset[] = [
  {
    id: "dir.assets",
    label: "Create folder assets/",
    description: "Empty directory at the OPFS root.",
    kind: "dir",
    async run() {
      const path = await ensureDirPath("assets");
      return { path, message: "directory created" };
    },
  },
  {
    id: "img.png",
    label: "Generate PNG image",
    description: "200×200 gradient with overlayed text. Saved as assets/image.png.",
    kind: "file",
    async run() {
      const blob = await pngGradient();
      return writeFile("assets/image.png", blob);
    },
  },
  {
    id: "img.svg",
    label: "Generate SVG image",
    description: "Static SVG gradient. Saved as assets/image.svg.",
    kind: "file",
    async run() {
      return writeFile("assets/image.svg", svgGradient());
    },
  },
  {
    id: "audio.wav",
    label: "Generate WAV (1s 440Hz)",
    description: "PCM-16 mono sine wave. Saved as assets/tone.wav.",
    kind: "file",
    async run() {
      return writeFile("assets/tone.wav", wavSine());
    },
  },
  {
    id: "video.webm",
    label: "Generate WebM (2s)",
    description: "MediaRecorder captures a 2-second canvas gradient as WebM.",
    kind: "file",
    async run() {
      const blob = await webmGradient();
      if (!blob) {
        return {
          message: "MediaRecorder not supported in this browser",
        };
      }
      return writeFile("assets/video.webm", blob);
    },
  },
  {
    id: "doc.pdf",
    label: "Generate PDF",
    description: "Minimal valid PDF 1.4 with one text line. Saved as assets/sample.pdf.",
    kind: "file",
    async run() {
      return writeFile("assets/sample.pdf", pdfSample());
    },
  },
  {
    id: "text.txt",
    label: "Generate TXT",
    description: "Plain text with a timestamp. Saved as notes.txt.",
    kind: "file",
    async run() {
      return writeFile("notes.txt", txtBody());
    },
  },
  {
    id: "text.json",
    label: "Generate JSON",
    description: "Small JSON payload. Saved as data.json.",
    kind: "file",
    async run() {
      return writeFile("data.json", jsonBody());
    },
  },
  {
    id: "text.json-update",
    label: "Update data.json",
    description:
      "Reads data.json, appends a new item, bumps generatedAt. Creates the file if missing.",
    kind: "file",
    async run() {
      const root = await navigator.storage.getDirectory();
      type Item = { id: number; name: string; value: number };
      type Doc = { generatedAt: string; items: Item[] };
      let doc: Doc = { generatedAt: "", items: [] };
      try {
        const fh = await root.getFileHandle("data.json");
        const text = await (await fh.getFile()).text();
        const parsed = JSON.parse(text) as Partial<Doc>;
        doc = {
          generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : "",
          items: Array.isArray(parsed.items) ? (parsed.items as Item[]) : [],
        };
      } catch {
        // file does not exist or contained invalid JSON — start fresh
      }
      const nextId = (doc.items.at(-1)?.id ?? 0) + 1;
      doc.items.push({
        id: nextId,
        name: `item-${nextId}`,
        value: Math.round(Math.random() * 1000) / 10,
      });
      doc.generatedAt = new Date().toISOString();
      return writeFile("data.json", JSON.stringify(doc, null, 2) + "\n");
    },
  },
  {
    id: "text.csv",
    label: "Generate CSV",
    description: "5 rows × 3 columns. Saved as data.csv.",
    kind: "file",
    async run() {
      return writeFile("data.csv", csvBody());
    },
  },
  {
    id: "text.md",
    label: "Generate Markdown",
    description: "Sample readme. Saved as readme.md.",
    kind: "file",
    async run() {
      return writeFile("readme.md", mdBody());
    },
  },
  {
    id: "tree.demo",
    label: "Create demo tree",
    description:
      "assets/{images,audio,videos,docs,data}/… with one file of each kind.",
    kind: "tree",
    async run() {
      const tree = await buildDemoTree();
      return { tree };
    },
  },
];
