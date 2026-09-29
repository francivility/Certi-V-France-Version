import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
    hmr: {
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/v': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})