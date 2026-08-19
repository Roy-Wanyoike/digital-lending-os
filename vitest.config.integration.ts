import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    include: ['**/__tests__/api/**/*.test.ts'],
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