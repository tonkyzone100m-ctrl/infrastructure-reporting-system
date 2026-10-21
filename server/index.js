import express from 'express'

import {
  checkDatabase,
  closeDatabase,
  pool,
} from './db.js'
import { HttpError } from './http.js'
import adminReportsRouter from './routes/adminReports.js'
import auditLogRouter from './routes/auditLog.js'
import authRouter from './routes/auth.js'
import commentsRouter from './routes/comments.js'
import departmentsRouter from './routes/departments.js'
import evidenceRouter from './routes/evidence.js'
import overviewRouter from './routes/overview.js'
import publicReportsRouter from './routes/publicReports.js'
import usersRouter from './routes/users.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]
const configuredOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set(
  configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins,
)

app.disable('x-powered-by')
app.use((request, response, next) => {
  const origin = request.headers.origin

  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }

  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.status(origin && allowedOrigins.has(origin) ? 204 : 403).end()
    return
  }

  next()
})
app.use(express.json({ limit: '16mb' }))

app.get('/api/health', async (_request, response) => {
  const database = await checkDatabase()
  const healthy = database.connected

  response.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database: database.configured
      ? (database.connected ? 'connected' : 'disconnected')
      : 'not-configured',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)
app.use('/api/reports', publicReportsRouter)
app.use('/api/admin/overview', overviewRouter)
app.use('/api/admin/reports/:reportId/comments', commentsRouter)
app.use('/api/admin/reports', adminReportsRouter)
app.use('/api/admin', evidenceRouter)
app.use('/api/admin/departments', departmentsRouter)
app.use('/api/admin/users', usersRouter)
app.use('/api/admin/audit_log', auditLogRouter)
app.use('/api/admin/audit-log', auditLogRouter)

app.use((_request, response) => {
  response.status(404).json({
    error: 'Route not found.',
  })
})

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    })
    return
  }

  if (error.type === 'entity.parse.failed') {
    response.status(400).json({
      error: 'The request body is not valid JSON.',
    })
    return
  }

  if (error.code === '22P02' || error.code === '22007') {
    response.status(400).json({
      error: 'The request contained an invalid value.',
    })
    return
  }

  console.error(
    `Unhandled request error: ${request.method} ${request.originalUrl}:`,
    error.message,
  )

  response.status(500).json({
    error: 'Internal server error.',
  })
})

const server = app.listen(port, () => {
  console.log(`ReportHub API listening on http://localhost:${port}`)

  if (!pool) {
    console.warn('DATABASE_URL is not configured; database routes will fail.')
  }
})

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  console.log(`${signal} received; shutting down.`)

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out.')
    process.exit(1)
  }, 10000)
  forceExit.unref()

  server.close(async () => {
    try {
      await closeDatabase()
      clearTimeout(forceExit)
      process.exit(0)
    } catch (error) {
      console.error('Shutdown failed:', error.message)
      process.exit(1)
    }
  })
}

process.on('SIGINT', () => {
  shutdown('SIGINT')
})
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})

export default app
