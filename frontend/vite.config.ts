import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path'; // Vite-compatible path resolution

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    https: {
      key: resolve('cert/key.pem'), // Resolves relative to project root
      cert: resolve('cert/cert.pem'),
    },
    host: 'localhost',
    strictPort: true,
  },
});