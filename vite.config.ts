import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base so the build works regardless of the repo name / Pages
  // sub-path it ends up deployed under. Using an absolute path like
  // "/Marketplace/" only works if the GitHub repo is named exactly
  // "Marketplace" (case-sensitive) — any mismatch causes every asset to
  // 404 and the page renders blank.
  base: "./",
});
