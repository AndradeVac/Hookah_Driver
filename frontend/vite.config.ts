import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Local API used by the dev proxy; override with API_PROXY_TARGET if it runs elsewhere.
  const apiProxyTarget = loadEnv(mode, '.', '').API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
