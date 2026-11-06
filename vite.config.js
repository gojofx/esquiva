import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  // En desarrollo (npm run dev) el WebSocket va al servidor Node (npm start) en el puerto 3000.
  server: { proxy: { "/ws": { target: "ws://localhost:3000", ws: true } } },
});
