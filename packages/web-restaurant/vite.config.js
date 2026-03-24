import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://api.theeazy.io',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://api.theeazy.io',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
