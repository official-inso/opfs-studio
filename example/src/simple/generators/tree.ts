import { writeToOpfs } from "../writer";
import { svgGradient, pngGradient } from "./image";
import { wavSine } from "./audio";
import { webmGradient } from "./video";
import { pdfSample } from "./pdf";
import { csvBody, jsonBody, mdBody, txtBody } from "./text";

export interface TreeReport {
  created: string[];
  skipped: string[];
}

/**
 * Build a small showcase tree under `assets/`:
 *   assets/
 *     images/  image.png, image.svg
 *     audio/   tone.wav
 *     videos/  clip.webm   (skipped if MediaRecorder unsupported)
 *     docs/    sample.pdf, readme.md
 *     data/    data.json, data.csv, notes.txt
 */
export async function buildDemoTree(): Promise<TreeReport> {
  const created: string[] = [];
  const skipped: string[] = [];

  const png = await pngGradient();
  await writeToOpfs("assets/images/image.png", png);
  created.push("assets/images/image.png");

  await writeToOpfs("assets/images/image.svg", svgGradient());
  created.push("assets/images/image.svg");

  await writeToOpfs("assets/audio/tone.wav", wavSine());
  created.push("assets/audio/tone.wav");

  const video = await webmGradient();
  if (video) {
    await writeToOpfs("assets/videos/clip.webm", video);
    created.push("assets/videos/clip.webm");
  } else {
    skipped.push("assets/videos/clip.webm (MediaRecorder not supported)");
  }

  await writeToOpfs("assets/docs/sample.pdf", pdfSample());
  created.push("assets/docs/sample.pdf");

  await writeToOpfs("assets/docs/readme.md", mdBody());
  created.push("assets/docs/readme.md");

  await writeToOpfs("assets/data/data.json", jsonBody());
  created.push("assets/data/data.json");

  await writeToOpfs("assets/data/data.csv", csvBody());
  created.push("assets/data/data.csv");

  await writeToOpfs("assets/data/notes.txt", txtBody());
  created.push("assets/data/notes.txt");

  return { created, skipped };
}
