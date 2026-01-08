import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import strip from '@rollup/plugin-strip'
import pkg from './package.json' assert { type: 'json' }


export default defineConfig({
  plugins: [
    react(),
    strip({
      labels: ['__DEBUG_STATEMENT__']
    })
  ],
  build: {
    lib: {
      entry: {
        '@nativesystems/redacted-core': 'src/index.ts',
        '@nativesystems/redacted-core/components': 'src/components/index.ts'
      },
      name: '@nativesystems/redacted-core',
      fileName: (format, entryName) => `${entryName}.${format}.js`
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.peerDependencies || {}),
        "react/jsx-runtime",
        "three"
      ],
    },
  },
})
