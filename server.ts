// Render用のエントリーポイント
import { serve } from '@hono/node-server'
import app from './index'

const port = Number(process.env.PORT) || 3000

console.log(`🚀 Server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port
})

console.log(`✅ Server running at http://localhost:${port}`)
