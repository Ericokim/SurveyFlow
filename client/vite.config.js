import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from repo root first, then allow frontend-specific overrides.
  const rootEnv = loadEnv(mode, rootDir, "");
  const localEnv = loadEnv(mode, __dirname, "");
  const env = { ...rootEnv, ...localEnv };

  // API URL without /api suffix - proxy and axios will add it
  // const apiUrl = (env.VITE_API_URL || `http://localhost:5001`).trim();

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      entries: ["index.html"],
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      extensions: [".js", ".ts", ".jsx", ".tsx"],
    },
    server: {
      watch: {
        usePolling: true,
      },
      host: true,
      strictPort: false,
      cors: true,
      // proxy: {
      //   "/api": {
      //     target: apiUrl,
      //     changeOrigin: true,
      //   },
      // },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Vite 8 / rolldown only accepts the function form of manualChunks.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\\/]node_modules[\\/](react|react-dom)[\\/]/.test(id))
              return "vendor";
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return "ui";
            if (/[\\/]node_modules[\\/]react-hook-form[\\/]/.test(id))
              return "forms";
            if (/[\\/]node_modules[\\/](clsx|tailwind-merge)[\\/]/.test(id))
              return "utils";
          },
        },
      },
    },
  };
});
