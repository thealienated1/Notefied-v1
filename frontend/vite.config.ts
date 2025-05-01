import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    https: {
      key: resolve('cert/key.pem'),
      cert: resolve('cert/cert.pem'),
    },
    host: 'localhost',
    strictPort: true,
    proxy: {
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // Allow HTTP target with HTTPS frontend
      },
      '/api/notes': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});