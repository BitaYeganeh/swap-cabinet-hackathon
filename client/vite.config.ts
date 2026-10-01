import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    // Listen on all network interfaces so other devices on the LAN can connect
    host: true,
    // Forward API calls to the Express server, so the browser only needs to reach Vite
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
