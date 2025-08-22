export function applySystemTheme(): void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const set = (dark: boolean) => {
    document.documentElement.classList.toggle("dark", dark);
    // Tailwind v4 darkMode: ['class'] уже настроен
  };
  set(mq.matches);
  mq.addEventListener("change", (e) => set(e.matches));
}

export const getTheme = (): "light" | "dark" => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    return mq.matches ? "dark" : "light";
  } catch (error) {
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  }
};

export const setTheme = (theme: "light" | "dark"): void => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};