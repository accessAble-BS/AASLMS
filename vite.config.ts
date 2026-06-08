import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@aas/shared-core': path.resolve(__dirname, '../AAS-SHARED-CORE/src/index.ts'),
    },
  },
});
