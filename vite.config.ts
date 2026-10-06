import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/DFA-Partition-Optimize/',

  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // We will register the service worker manually
      injectRegister: null,

      includeAssets: [
        'pwa-192x192.png',
        'pwa-512x512.png'
      ],

      manifest: {
        name: 'DFA Partition Optimizer',
        short_name: 'DFA Optimizer',

        description:
          'Interactive Hopcroft Algorithm Lab for DFA minimization',

        start_url: '/DFA-Partition-Optimize/',
        scope: '/DFA-Partition-Optimize/',

        display: 'standalone',
        orientation: 'portrait',

        theme_color: '#0f172a',
        background_color: '#0f172a',

        icons: [
          {
            src: '/DFA-Partition-Optimize/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/DFA-Partition-Optimize/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})