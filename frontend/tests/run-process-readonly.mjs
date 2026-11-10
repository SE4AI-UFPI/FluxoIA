import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  await server.ssrLoadModule('/tests/process-readonly.test.tsx')
} finally {
  await server.close()
}
