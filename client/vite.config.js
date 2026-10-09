import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Needed so the built app can be served on Railway's generated domain
  preview: { allowedHosts: true },
});
