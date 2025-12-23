import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteSingleFile } from 'vite-plugin-singlefile';

import { TransformEjs } from './src/lib/vite-plugins';
import { getRenderData } from './src/themes/data';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const dataFilename = process.env.DATA_FILENAME || './sample.cv.json'
const outDir = process.env.OUT_DIR || 'dist'
const siteUrl = process.env.SITE_URL || 'xenking.pro'

const data = require(dataFilename)
const renderData = getRenderData(data)
renderData.theme = process.env.THEME || 'xenking'
renderData.siteUrl = siteUrl
renderData.isProduction = process.env.NODE_ENV === 'production'
renderData.meta = {
  title: data.basics.name,
  description: data.basics.summary.replace('\n', ' '),
}


export default defineConfig({
  build: {
    outDir: outDir,
  },
  define: {
    'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
  },
  resolve: {
    alias: {
      // remove the "Module "fs" has been externalized" warning for ejs
      'fs': resolve(__dirname, 'src/lib/fs-polyfill.js'),
    },
  },
  plugins: [
    TransformEjs(),
    ViteEjsPlugin(
      renderData,
      {
        ejs: (viteConfig) => ({
          // ejs options goes here.
          views: [resolve(__dirname)],
        })
      }
    ),
    viteSingleFile(),
  ],
})
