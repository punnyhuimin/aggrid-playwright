import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Copies @arcgis/core assets (fonts, workers, i18n) into the Vite output so
    // esriConfig.assetsPath = '/arcgis-assets' resolves correctly in both dev and build.
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@arcgis/core/assets',
          dest: 'arcgis-assets',
        },
      ],
    }),
  ],
})
