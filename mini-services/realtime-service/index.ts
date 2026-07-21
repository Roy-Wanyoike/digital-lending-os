import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(event: string, data?: unknown) {
  const ts = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[${ts}] ${event}`, JSON.stringify(data))
  } else {
    console.log(`[${ts}] ${event}`)
  }
}

function randomBetween(min: number, max: number, decimals = 1): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals))
}

// ─── HTTP + Socket.IO Server ─────────────────────────────────────────────────

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Simulated business IDs for periodic demo broadcasts ──────────────────────

const DEMO_BUSINESS_IDS = [
  'biz_1', 'biz_2', 'biz_3', 'biz_4', 'biz_5',
  'biz_6', 'biz_7', 'biz_8', 'biz_9', 'biz_10',
]

const BUSINESS_NAMES: Record<string, string> = {
  biz_1: 'Pacific Trade Co.', biz_2: 'Berlin Industrie GmbH', biz_3: 'Shenzhen Tech Solutions',
  biz_4: 'London Bridge Imports', biz_5: 'Dubai Golden Trade', biz_6: 'Tokyo Electronics Ltd.',
  biz_7: 'Singapore Global Pte', biz_8: 'Mumbai Textile Mills', biz_9: 'São Paulo Agro Ltd.',
  biz_10: 'Lagos Trade Hub',
}

let connectedClients = 0

// ─── Connection Handling ─────────────────────────────────────────────────────

io.on('connection', (socket) => {
  connectedClients++
  log(`CONNECT`, { socketId: socket.id, totalClients: connectedClients })

  // ── Subscribe: Business Room ─────────────────────────────────────────────

  socket.on('subscribe:business', (data: { businessId: string }) => {
    const { businessId } = data
    const room = `business:${businessId}`
    socket.join(room)
    socket.join('dashboard') // Also join global dashboard room
    log(`SUBSCRIBE:BUSINESS`, { socketId: socket.id, businessId, room })
  })

  socket.on('subscribe:dashboard', () => {
    socket.join('dashboard')
    log(`SUBSCRIBE:DASHBOARD`, { socketId: socket.id })
  })

  // ── Subscribe: Escrow Room ───────────────────────────────────────────────

  socket.on('subscribe:escrow', (data: { escrowId: string }) => {
    const { escrowId } = data
    const room = `escrow:${escrowId}`
    socket.join(room)
    log(`SUBSCRIBE:ESCROW`, { socketId: socket.id, escrowId, room })
  })

  // ── Unsubscribe: Business Room ───────────────────────────────────────────

  socket.on('unsubscribe:business', (data: { businessId: string }) => {
    const { businessId } = data
    const room = `business:${businessId}`
    socket.leave(room)
    log(`UNSUBSCRIBE:BUSINESS`, { socketId: socket.id, businessId, room })
  })

  // ── Unsubscribe: Escrow Room ─────────────────────────────────────────────

  socket.on('unsubscribe:escrow', (data: { escrowId: string }) => {
    const { escrowId } = data
    const room = `escrow:${escrowId}`
    socket.leave(room)
    log(`UNSUBSCRIBE:ESCROW`, { socketId: socket.id, escrowId, room })
  })

  // ── Disconnect ───────────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    connectedClients--
    log(`DISCONNECT`, { socketId: socket.id, reason, totalClients: connectedClients })
  })

  // ── Error ────────────────────────────────────────────────────────────────

  socket.on('error', (error) => {
    log(`ERROR`, { socketId: socket.id, error: String(error) })
  })
})

// ─── Broadcast Helpers (called by external APIs or internal timers) ───────────

/**
 * Broadcast a trust score update to a specific business room.
 */
function broadcastTrustScoreUpdate(payload: {
  businessId: string
  overallScore: number
  paymentScore: number
  deliveryScore: number
  qualityScore: number
}) {
  const eventPayload = {
    ...payload,
    businessName: BUSINESS_NAMES[payload.businessId] || payload.businessId,
    timestamp: new Date().toISOString(),
  }
  const room = `business:${payload.businessId}`
  io.to(room).emit('trust:score_updated', eventPayload)
  io.to('dashboard').emit('trust:score_updated', eventPayload)
  log(`EMIT trust:score_updated → ${room}`, eventPayload)
}

/**
 * Broadcast an escrow status change to the escrow room and both buyer/seller business rooms.
 */
function broadcastEscrowStatusChange(payload: {
  escrowId: string
  txRef: string
  status: string
  updatedBy: string
  buyerBusinessId?: string
  sellerBusinessId?: string
}) {
  const { buyerBusinessId, sellerBusinessId, ...rest } = payload
  const eventPayload = {
    ...rest,
    timestamp: new Date().toISOString(),
  }

  // Emit to escrow room
  const escrowRoom = `escrow:${payload.escrowId}`
  io.to(escrowRoom).emit('escrow:status_changed', eventPayload)
  log(`EMIT escrow:status_changed → ${escrowRoom}`, eventPayload)

  // Emit to buyer and seller business rooms if provided
  if (buyerBusinessId) {
    const buyerRoom = `business:${buyerBusinessId}`
    io.to(buyerRoom).emit('escrow:status_changed', eventPayload)
    log(`EMIT escrow:status_changed → ${buyerRoom}`, eventPayload)
  }
  if (sellerBusinessId) {
    const sellerRoom = `business:${sellerBusinessId}`
    io.to(sellerRoom).emit('escrow:status_changed', eventPayload)
    log(`EMIT escrow:status_changed → ${sellerRoom}`, eventPayload)
  }
}

/**
 * Broadcast a milestone release to the escrow room.
 */
function broadcastMilestoneReleased(payload: {
  escrowId: string
  milestoneId: string
  sequence: number
  amount: number
  releasedBy: string
}) {
  const eventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  }
  const room = `escrow:${payload.escrowId}`
  io.to(room).emit('escrow:milestone_released', eventPayload)
  log(`EMIT escrow:milestone_released → ${room}`, eventPayload)
}

/**
 * Broadcast a dispute creation to the escrow room.
 */
function broadcastDisputeCreated(payload: {
  escrowId: string
  disputeId: string
  reason: string
  raisedBy: string
}) {
  const eventPayload = {
    ...payload,
    timestamp: new Date().toISOString(),
  }
  const room = `escrow:${payload.escrowId}`
  io.to(room).emit('escrow:dispute_created', eventPayload)
  log(`EMIT escrow:dispute_created → ${room}`, eventPayload)
}

/**
 * Broadcast a payment status change to business rooms.
 */
function broadcastPaymentStatusChange(payload: {
  intentId: string
  status: string
  amount: number
  currency: string
  businessId: string
}) {
  const { businessId, ...rest } = payload
  const eventPayload = {
    ...rest,
    timestamp: new Date().toISOString(),
  }
  const room = `business:${businessId}`
  io.to(room).emit('payment:status_changed', eventPayload)
  log(`EMIT payment:status_changed → ${room}`, eventPayload)
}

/**
 * Send a general notification to a business room.
 */
function broadcastNotification(payload: {
  type: string
  title: string
  message: string
  businessId: string
}) {
  const { businessId, ...rest } = payload
  const eventPayload = {
    ...rest,
    businessId,
    timestamp: new Date().toISOString(),
  }
  const room = `business:${businessId}`
  io.to(room).emit('notification', eventPayload)
  log(`EMIT notification → ${room}`, eventPayload)
}

// Expose broadcast functions globally for external API calls if needed
const broadcast = {
  trustScoreUpdate: broadcastTrustScoreUpdate,
  escrowStatusChange: broadcastEscrowStatusChange,
  milestoneReleased: broadcastMilestoneReleased,
  disputeCreated: broadcastDisputeCreated,
  paymentStatusChange: broadcastPaymentStatusChange,
  notification: broadcastNotification,
}

// Make available for potential inter-process communication
;(globalThis as Record<string, unknown>).__youngsend_broadcast = broadcast

// ─── Periodic Timers ─────────────────────────────────────────────────────────

// Every 30 seconds: simulate a trust score update for a random business
const TRUST_SCORE_INTERVAL = 30_000

const trustScoreTimer = setInterval(() => {
  const businessId = DEMO_BUSINESS_IDS[Math.floor(Math.random() * DEMO_BUSINESS_IDS.length)]

  // Generate scores with slight random variation
  const baseScore = randomBetween(70, 98)
  const paymentScore = randomBetween(65, 100)
  const deliveryScore = randomBetween(60, 100)
  const qualityScore = randomBetween(65, 100)
  const overallScore = Number(
    ((paymentScore * 0.4 + deliveryScore * 0.3 + qualityScore * 0.3)).toFixed(1)
  )

  broadcastTrustScoreUpdate({
    businessId,
    overallScore,
    paymentScore,
    deliveryScore,
    qualityScore,
  })
}, TRUST_SCORE_INTERVAL)

// Every 15 seconds: heartbeat ping to all connected clients
const HEARTBEAT_INTERVAL = 15_000

const heartbeatTimer = setInterval(() => {
  const activeClients = io.sockets.sockets.size
  if (activeClients > 0) {
    io.emit('ping', { timestamp: new Date().toISOString() })
    log(`HEARTBEAT ping`, { activeClients })
  }
}, HEARTBEAT_INTERVAL)

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = 3003

httpServer.listen(PORT, () => {
  log(`Youngsend Realtime Service started on port ${PORT}`)
  log(`CORS: allowed all origins`)
  log(`Timers: trust-score demo every ${TRUST_SCORE_INTERVAL / 1000}s, heartbeat every ${HEARTBEAT_INTERVAL / 1000}s`)
})

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function shutdown(signal: string) {
  log(`Received ${signal}, shutting down...`)
  clearInterval(trustScoreTimer)
  clearInterval(heartbeatTimer)
  io.close(() => {
    log(`All sockets closed`)
    httpServer.close(() => {
      log(`HTTP server closed`)
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))