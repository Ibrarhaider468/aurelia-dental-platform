import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so Cloudflare Pages (and similar hosts) load JS/CSS correctly
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    cssMinify: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
