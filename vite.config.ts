import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/VohsaHub/',
  plugins: [preact()],
  server: {
    port: 3000,
    open: false,
  },
  optimizeDeps: {
    include: ['monaco-editor', 'eta', 'lucide-preact'],
  },
});
