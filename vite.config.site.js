import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';

import { TransformEjs } from './src/lib/vite-plugins';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, 'src')
const renderData = {
  meta: {
    title: "jsoncv",
    description: "A toolkit for building your CV with JSON and creating stylish HTML/PDF files.",
    url: "https://jsoncv.xenking.pro",
    twitter: {
      card: "summary",
      username: "xenking",
    }
  },
  editorMeta: {
    title: "jsoncv Editor",
    description: "The online editor of the jsoncv project.",
    url: "https://jsoncv.xenking.pro/editor/",
    twitter: {
      card: "summary",
      username: "xenking",
    }
  }
}

export default defineConfig({
  root: 'src',
  build: {
    // allows 'import.meta.glob' to work
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        editor: resolve(rootDir, 'editor/index.html'),
        preview: resolve(rootDir, 'preview/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      // remove the "Module "fs" has been externalized" warning for ejs
      'fs': 'src/lib/fs-polyfill.js',
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
  ],
})
