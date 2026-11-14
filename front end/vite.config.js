import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173
  }
});
