import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 4001),
    proxy: {
      // Keep proxy target independent of VITE_API_URL (empty = same-origin /api in the browser).
      "/api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
      "/demo-api": {
        target: process.env.VITE_DEV_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: "es",
  },
});
