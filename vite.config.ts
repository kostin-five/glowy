import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter((dep) => !dep.includes("/charts-")),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /src\/api\/(config|unauthorizedInterceptor)\.ts$/.test(id)
          ) {
            return "api-core";
          }

          if (
            /node_modules\/(axios|react|react-dom|react-router-dom|zustand)\//.test(id)
          ) {
            return "vendor";
          }

          if (/node_modules\/recharts\//.test(id)) {
            return "charts";
          }

          if (
            /node_modules\/(framer-motion|lucide-react|@headlessui\/react)\//.test(
              id
            )
          ) {
            return "ui";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      includeAssets: [
        "Glowy.png",
        "Glowy-dark.png",
        "manifest.json",
        "robots.txt",
        "sitemap.xml",
        "icons/apple-icon-180.png",
        "icons/manifest-icon-192.maskable.png",
        "icons/manifest-icon-512.maskable.png",
      ],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{html,js,css}"],
        globIgnores: [
          "**/apple-splash-*.jpg",
          "**/charts-*.js",
          "**/*.woff",
          "**/*.woff2",
        ],
      },
      manifest: {
        name: "Glowy — AI Task Tracker",
        short_name: "Glowy",
        description: "Эмпатичный таск-трекер с ИИ-управлением энергией",
        theme_color: "#4f46e5",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icons/apple-icon-180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/manifest-icon-192.maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/manifest-icon-512.maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
