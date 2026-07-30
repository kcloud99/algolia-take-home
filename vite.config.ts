import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // The app is one folder in a repo that also holds the pipeline, so Vite's root is `app/`
  // rather than the repo root. Everything below follows from that.
  root: 'app',

  // `.env` lives at the repo root because `scripts/` reads the same file. Without this, Vite
  // would look for it inside `app/` and every `VITE_` variable would be silently undefined.
  envDir: '..',

  // Build to `dist/` at the repo root, which is where a Vercel deploy expects to find it.
  build: { outDir: '../dist', emptyOutDir: true },

  plugins: [react(), tailwindcss()],
});
