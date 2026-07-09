import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_HOST || "0.0.0.0",
    port: Number(process.env.VITE_PORT || 5173),
    proxy: {
      "/api": process.env.VITE_API_PROXY_TARGET || "http://localhost:3000"
    }
  }
});
