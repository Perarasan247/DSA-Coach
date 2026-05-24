import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` matters for GitHub Pages, which serves the site under
// /<REPO>/. In dev we still want /, so we only apply the prefix at build time.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/DSA-Coach/' : '/',
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
  },
}) as any);
