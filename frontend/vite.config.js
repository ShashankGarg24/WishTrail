import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(configDir, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
  },
  base: '/',
  server: {
    fs: {
      allow: [path.resolve(configDir, '..')]
    }
  },
});
