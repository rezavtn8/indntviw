import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // The app previously shipped as one ~3.3 MB bundle, so first paint had
        // to wait on three.js, xlsx and jsPDF even on the 2D heatmap view.
        // Splitting these lets the browser cache them separately and fetch the
        // heavy ones only when their view is reached.
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          spreadsheet: ["xlsx"],
          pdf: ["jspdf", "html2canvas"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}));
