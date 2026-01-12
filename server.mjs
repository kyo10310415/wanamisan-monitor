// Render用サーバー - ビルド済みWorkerを使用
import { serve } from '@hono/node-server'

const port = parseInt(process.env.PORT || '3000')

console.log('🚀 Loading application...')
console.log(`📍 Port: ${port}`)
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)

// ビルドされたWorkerをインポート
import('./dist/_worker.js')
  .then((module) => {
    const app = module.default
    
    serve({
      fetch: app.fetch,
      port
    })
    
    console.log(`✅ Server is running on http://localhost:${port}`)
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  })
