import { defineConfig, loadEnv } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_ORIGIN || "https://capstone.studylink.click",
          changeOrigin: true,
        },
        "/sse": {
          target: env.VITE_SSE_ORIGIN || "http://localhost:8081",
          changeOrigin: true,
        },
      },
    },
    assetsInclude: ["**/*.svg", "**/*.csv"],
  };
});
