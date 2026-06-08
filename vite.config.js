import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/overpass/, '/api/interpreter'),
      }
    }
  }
})
