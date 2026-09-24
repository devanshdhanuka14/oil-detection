import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Everything must be inlined or bundled: the app runs with Wi-Fi off.
  build: { assetsInlineLimit: 0, target: 'es2022' },
});
