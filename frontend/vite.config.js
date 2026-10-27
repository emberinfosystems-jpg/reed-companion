import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api to the Reed server so the browser never sees model keys or the backend port.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:4310" },
  },
});
