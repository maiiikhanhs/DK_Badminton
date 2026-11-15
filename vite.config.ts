import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const otpEndpoint = loadEnv(mode, process.cwd(), '').VITE_OTP_ENDPOINT?.trim()
  const otpUrl = otpEndpoint ? new URL(otpEndpoint) : null

  return {
    plugins: [react()],
    server: otpUrl ? {
      proxy: {
        '/api/otp': {
          target: otpUrl.origin,
          changeOrigin: true,
          secure: true,
          rewrite: () => `${otpUrl.pathname}${otpUrl.search}`,
        },
      },
    } : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      clearMocks: true,
    },
  }
})
