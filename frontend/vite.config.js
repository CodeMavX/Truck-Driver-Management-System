import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to IPv4 so http://localhost:5173 works (Windows can otherwise
    // bind the dev server to IPv6 [::1] only, which refuses localhost).
    host: '127.0.0.1',
    port: 5173,
  },
})
