import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const isComponentCatalog = process.env.GLOWY_COMPONENT_CATALOG === "true";
const deploymentHeaders = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"))
  .headers.find((rule: { source: string }) => rule.source === "/(.*)").headers as { key: string; value: string }[];
const previewHeaders = Object.fromEntries(deploymentHeaders.map(({ key, value }) => [key,
  key === "Content-Security-Policy" && process.env.GLOWY_E2E_LOCAL_API === "true"
    ? value.replace("connect-src 'self' https:;", "connect-src 'self' https: http://localhost:3001;")
    : value]));

// https://vite.dev/config/
export default defineConfig({
  // Exercise the same static security headers locally as on Vercel.
  preview: { headers: previewHeaders },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
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
    // Storybook imports the same token CSS through Vite, but it must stay an
    // isolated catalog rather than registering a product service worker.
    ...(isComponentCatalog
      ? []
      : [
          VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      devOptions: {
        // A development worker can retain Vite modules between code changes.
        // Production PWA behavior is still generated and verified by `npm run build`.
        enabled: false,
      },
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
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{html,js,css}"],
        globIgnores: [
          "**/apple-splash-*.jpg",
          "**/*.woff",
          "**/*.woff2",
        ],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "glowy-pages",
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ request }) =>
              ["script", "style", "font", "image"].includes(
                request.destination
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "glowy-static",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
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
        ]),
  ],
});
