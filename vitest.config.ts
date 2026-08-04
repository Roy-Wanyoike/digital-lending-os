import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    // Exclude integration tests (require running dev server on localhost:3000)
    exclude: ['**/node_modules/**', '**/__tests__/api/**'],
  },
  resolve: {
    alias: {
      '@/lib': path.resolve(__dirname, './src/backend/lib'),
      '@/backend/lib': path.resolve(__dirname, './src/backend/lib'),
      '@/backend/middleware': path.resolve(__dirname, './src/backend/middleware'),
      '@/backend/services': path.resolve(__dirname, './src/backend/services'),
      '@/backend/config': path.resolve(__dirname, './src/backend/config'),
      '@/backend': path.resolve(__dirname, './src/backend'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
