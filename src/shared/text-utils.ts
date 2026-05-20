export type EolStyle = "lf" | "crlf";

export function extOf(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

export function detectEol(text: string): EolStyle {
  return /\r\n/.test(text) ? "crlf" : "lf";
}

export function toLF(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function fromLF(textLF: string, eol: EolStyle): string {
  return eol === "lf" ? textLF : textLF.replace(/\n/g, "\r\n");
}

export const TEXTUAL_EXT = new Set<string>([
  "ts", "tsx", "js", "jsx", "json",
  "css", "scss", "less",
  "md", "markdown",
  "html", "xml", "svg",
  "txt", "csv", "tsv", "yml", "yaml", "toml", "ini", "conf", "cfg", "env",
  "log", "sql", "dockerfile", "dockerignore", "makefile",
  "py", "pyw", "go", "rs", "rb", "php", "java", "kt", "kts",
  "c", "h", "cpp", "cc", "cxx", "hpp", "cs",
  "sh", "bash", "zsh", "fish",
  "lua", "pl", "pm", "r", "swift", "dart",
]);

export function isTextual(ext: string): boolean {
  return TEXTUAL_EXT.has(ext);
}
