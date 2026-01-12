import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'

// メインアプリをインポート
import app from './index'

const PORT = process.env.PORT || 3000

console.log(`🚀 Starting server on port ${PORT}...`)

serve({
  fetch: app.fetch,
  port: Number(PORT)
}, (info) => {
  console.log(`✅ Server is running on http://localhost:${info.port}`)
})
