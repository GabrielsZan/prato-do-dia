import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Publicado em https://gabrielszan.github.io/prato-do-dia/
export default defineConfig({
  base: '/prato-do-dia/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Prato do Dia',
        short_name: 'Prato do Dia',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#F7F7F2',
        theme_color: '#F7F7F2',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json,wasm}'], maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 },
    }),
  ],
  test: { environment: 'node' },
});
