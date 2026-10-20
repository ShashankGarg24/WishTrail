import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path";
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'preserve-rocket-loader-opt-out',
      transformIndexHtml: {
        order: 'post',
        // Vite recreates the production entry tag and drops custom attributes.
        handler: html => html.replace(
          /<script\b[^>]*\btype="module"[^>]*>/g,
          tag => tag.includes('data-cfasync=') ? tag : tag.replace('<script', '<script data-cfasync="false"'),
        ),
      },
    },
  ],
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
