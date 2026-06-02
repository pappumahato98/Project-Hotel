import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer((req, res) => {
  // Handle HTTP API endpoints BEFORE Socket.io
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        realtimeIo.emit(event.event, event.data)
        console.log(`[Broadcast] ${event.event}:`, JSON.stringify(event.data).slice(0, 120))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, event: event.event }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', connections: connectedClients.size }))
    return
  }

  // Let Socket.io handle other requests (WS upgrade, polling, etc.)
  res.writeHead(404)
  res.end('Not Found')
})

// Socket.io for client connections - mounted on default /socket.io path
const realtimeIo = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Track connected clients
const connectedClients = new Map<string, { userId?: string; propertyId?: string; connectedAt: Date }>()

realtimeIo.on('connection', (socket) => {
  console.log(`[Client connected] ${socket.id}`)
  connectedClients.set(socket.id, { connectedAt: new Date() })

  // Send initial connection confirmation
  socket.emit('connected', { socketId: socket.id, timestamp: new Date().toISOString() })

  // Client subscribes to a property
  socket.on('subscribe-property', (data: { propertyId: string; userId?: string }) => {
    const client = connectedClients.get(socket.id)
    if (client) {
      client.propertyId = data.propertyId
      client.userId = data.userId
    }
    socket.join(`property:${data.propertyId}`)
    console.log(`[Subscribe] ${socket.id} -> property:${data.propertyId}`)
  })

  // Client subscribes to a specific module channel
  socket.on('subscribe-module', (data: { module: string }) => {
    socket.join(`module:${data.module}`)
    console.log(`[Subscribe] ${socket.id} -> module:${data.module}`)
  })

  // General message handler
  socket.on('message', (data: { type: string; payload: unknown }) => {
    console.log(`[Message] ${socket.id}: ${data.type}`)
    socket.emit('message-ack', { type: data.type, received: true, timestamp: new Date().toISOString() })
  })

  // Typing indicator (for chat features)
  socket.on('typing', (data: { room?: string; user: string }) => {
    if (data.room) {
      socket.to(`room:${data.room}`).emit('user-typing', { user: data.user })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`[Client disconnected] ${socket.id} (${reason})`)
    connectedClients.delete(socket.id)
  })

  socket.on('error', (error) => {
    console.error(`[Socket error] ${socket.id}:`, error)
  })
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[Realtime Service] Running on port ${PORT}`)
  console.log(`[Realtime Service] Socket.io endpoint: http://localhost:${PORT}/socket.io/`)
  console.log(`[Realtime Service] HTTP broadcast: http://localhost:${PORT}/broadcast`)
  console.log(`[Realtime Service] Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Realtime Service] SIGTERM, shutting down...')
  realtimeIo.close()
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[Realtime Service] SIGINT, shutting down...')
  realtimeIo.close()
  httpServer.close(() => process.exit(0))
})
