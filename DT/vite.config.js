import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 상대 경로 설정을 위해 추가 (오프라인/로컬 실행 지원)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
