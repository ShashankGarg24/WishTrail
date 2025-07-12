import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'frontend/dist',
  },
  base: '/', // required for Vercel SPA routing
})