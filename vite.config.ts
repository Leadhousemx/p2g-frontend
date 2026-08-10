import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === "production";
  const devProxyTarget = "https://api.brentrix.com";
  const devPort = Number(env.PORT) || 5173;

  return {
  base: "/",
  plugins: [tsconfigPaths(), react()],
  esbuild: {
    drop: isProd ? ["debugger"] : [],
    pure: isProd
      ? ["console.log", "console.info", "console.debug", "console.trace"]
      : [],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: devPort,
    strictPort: false,
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
      clientPort: devPort,
      host: "localhost",
      port: devPort,
      protocol: "ws",
    },
  },
  };
});
