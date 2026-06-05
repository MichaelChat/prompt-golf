import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set VITE_BASE_PATH in your env to /repo-name/ when deploying to GitHub Pages
// e.g. VITE_BASE_PATH=/promptgolf/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});
