import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/overpass': {
        target: 'https://overpass.openstreetmap.fr',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 60000,
        timeout: 60000,
        rewrite: (path) => path.replace(/^\/overpass/, '/api/interpreter'),
      }
    }
  }
})
