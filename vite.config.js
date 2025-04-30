import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/badminton-queue/', // 這裡要和你的 repo 名稱一致
  plugins: [react()],
});