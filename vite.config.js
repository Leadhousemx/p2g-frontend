import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devProxyTarget = "https://api.brentrix.com";
const devPort = Number(process.env.PORT) || 5173;

export default defineConfig(({ mode }) => ({
  base: "/",
  plugins: [react()],
  esbuild: {
    drop: mode === "production" ? ["debugger"] : [],
    pure: mode === "production"
      ? ["console.log", "console.info", "console.debug", "console.trace"]
      : [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
  server: {
    port: devPort,
    strictPort: false,
    middlewareMode: false,
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
          });
        },
      },
    },
    hmr: {
      host: "localhost",
      port: devPort,
      protocol: "ws",
    },
  },
}));
