import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { copyFileSync, mkdirSync } from "fs"

// Copy web-ifc WASM to public/ so it's served locally (no CDN dependency)
try {
  mkdirSync("public", { recursive: true })
  copyFileSync("node_modules/web-ifc/web-ifc.wasm", "public/web-ifc.wasm")
} catch { /* ignore if file not present yet */ }

export default defineConfig({
  base: "./",
  plugins: [react()],
  optimizeDeps: {
    exclude: ["web-ifc"],
  },
  worker: {
    format: "es",
  },
  server: {
    port: 3000,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
