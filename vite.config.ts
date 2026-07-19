import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BASE lets you deploy under a subpath (e.g. GitHub Pages project site "/repo/").
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4173",
    },
  },
});
