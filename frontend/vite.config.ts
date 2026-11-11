import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true } },
    watch: { usePolling: true, interval: 300 },
  },
})
