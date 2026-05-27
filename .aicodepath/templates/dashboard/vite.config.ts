import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3899,
    proxy: {
      '/api': {
        target: 'http://localhost:3888',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3888',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
