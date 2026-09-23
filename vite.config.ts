import { defineConfig } from "vite";

// Set VITE_BASE=/repo/ for GitHub Pages; root hosting uses /.
const base = process.env.VITE_BASE ?? "/";
if (!base.startsWith("/") || !base.endsWith("/")) {
  throw new Error("VITE_BASE must start and end with /");
}

export default defineConfig({ base, build: { sourcemap: false } });
