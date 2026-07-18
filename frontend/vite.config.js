import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isFactoryDebug = mode === 'factory-debug';

  return {
    base: './',
    plugins: [react()],
    publicDir: isFactoryDebug ? false : 'public',
    resolve: {
      alias: {
        '@app-entry': path.resolve(
          configDir,
          isFactoryDebug ? 'src/FactoryDebugApp.jsx' : 'src/App.jsx'
        ),
      },
    },
    define: {
      __HEYBO_BUILD_MODE__: JSON.stringify(isFactoryDebug ? 'factory-debug' : 'consumer'),
    },
    server: {
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
            },
        },
    },
  };
});
