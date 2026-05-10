import { defineConfig } from 'vite';

export default defineConfig({
  base: '/haunted-quill/',
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
