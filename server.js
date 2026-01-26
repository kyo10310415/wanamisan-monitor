// Render用のシンプルなNode.jsサーバー
import { serve } from '@hono/node-server'
import app from './src/index.js'

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Starting server on port ${port}...`)
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🔑 JWT_SECRET configured: ${!!process.env.JWT_SECRET}`)

try {
  serve({
    fetch: app.fetch,
    port
  })
  
  console.log(`✅ Server is running on http://localhost:${port}`)
} catch (error) {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
}
