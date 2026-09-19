import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "./", // Permite que funcione directo en GitHub Pages sin importar el subdirectorio
  plugins: [react(), tailwindcss()],
});
