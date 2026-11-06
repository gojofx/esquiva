import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relativa: funciona en https://<usuario>.github.io/<repositorio>/ sin configurar el nombre.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
