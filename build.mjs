// 构建脚本：绕过 Vite 7 的 node_modules/.vite-temp 写入问题
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const tailwindConfig = require('./tailwind.config.cjs');

console.log('Tailwind content:', tailwindConfig.content);

    try {
  await build({
    root: __dirname,
    configFile: false,
    base: './',
    cacheDir: '.vite-cache',
    build: { emptyOutDir: false, outDir: 'dist' },
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') }
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss(tailwindConfig),
          autoprefixer()
        ]
      }
    },
    logLevel: 'info'
  });
  console.log('BUILD_SUCCESS');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
