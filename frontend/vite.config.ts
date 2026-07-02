import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
    ],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    modulePreload: {
      polyfill: false,
      resolveDependencies(_filename, deps) {
        return deps.filter((dep) => !dep.includes('charts') && !dep.includes('motion'))
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            /node_modules[/\\]react[/\\]/.test(id)
          ) {
            return 'react-vendor'
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
            return 'charts'
          }
          if (id.includes('framer-motion')) {
            return 'motion'
          }
          if (id.includes('@radix-ui')) {
            return 'radix'
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query'
          }
          if (id.includes('axios')) {
            return 'http'
          }
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform') ||
            id.includes('/zod/')
          ) {
            return 'forms'
          }
          if (id.includes('lucide-react')) {
            return 'icons'
          }
          if (id.includes('sonner')) {
            return 'sonner'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    warmup: {
      clientFiles: [
        './index.html',
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/LoginPage.tsx',
        './src/index.css',
        './src/context/AuthContext.tsx',
        './src/api/client.ts',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
