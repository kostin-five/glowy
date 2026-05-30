import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      includeAssets: ["**/*.{html,js,css,png,svg,ico,woff2}"],
      workbox: {
        globPatterns: ["**/*.{html,js,css,png,svg,ico,woff2}"],
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
            src: "/Glowy.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/Glowy.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
