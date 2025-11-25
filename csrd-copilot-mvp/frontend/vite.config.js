import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/upload-data': 'http://localhost:8080',
            '/generate-draft': 'http://localhost:8080'
        }
    }
})
