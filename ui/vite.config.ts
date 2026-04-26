import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, "../data"),
    },
  },
  server: {
    fs: {
      allow: [".."],
    },
    proxy: {
      "/hiro": {
        target: "https://api.hiro.so",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/hiro/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            const key = process.env.HIRO_API_KEY;
            if (key) proxyReq.setHeader("x-api-key", key);
          });
        },
      },
    },
  },
});
