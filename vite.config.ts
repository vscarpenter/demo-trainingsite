import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin to copy content manifest to dist directory
const copyContentManifestPlugin = () => ({
  name: 'copy-content-manifest',
  writeBundle() {
    const srcPath = path.resolve(__dirname, 'src/data/content-manifest.json')
    const distPath = path.resolve(__dirname, 'dist/content-manifest.json')

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, distPath)
      console.log('✅ Copied content-manifest.json to dist/')
    } else {
      console.warn('⚠️  content-manifest.json not found in src/data/')
    }
  }
})

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), copyContentManifestPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Make some env variables available to the client
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    build: {
      // Generate source maps for production debugging
      sourcemap: mode === 'development',
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-accordion', '@radix-ui/react-progress', '@radix-ui/react-separator'],
            icons: ['lucide-react', '@radix-ui/react-icons'],
          },
        },
      },
      // Set chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // Enable CORS for development
      cors: true,
      // Serve static files from public directory
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..']
      }
    },
    // Ensure public files are served correctly
    publicDir: 'public',
    preview: {
      // Configure preview server
      port: 4173,
      cors: true,
    },
    // Environment variable prefix
    envPrefix: 'VITE_',
  }
})
