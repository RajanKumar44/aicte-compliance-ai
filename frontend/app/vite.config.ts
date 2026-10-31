import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";

let commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VITE_GIT_COMMIT_SHA || "";
if (!commitSha) {
  try {
    commitSha = execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    commitSha = "dev-local";
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(commitSha),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
      "/version": "http://127.0.0.1:8000",
    },
  },
});
