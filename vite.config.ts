import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@c3/shared': path.resolve(__dirname, '../../shared/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3002,
    allowedHosts: ['saxa', 'localhost'],
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});