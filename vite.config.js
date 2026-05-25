import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [{ src: 'public/config.json', dest: '.' }]
    })
  ],
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'FilamentQuoter',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'quoter.js'
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
