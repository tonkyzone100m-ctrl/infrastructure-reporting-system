import express from 'express'
import pg from 'pg'

const app = express()
const port = Number(process.env.PORT || 3000)
const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null

app.use(express.json({ limit: '10mb' }))

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', request.headers.origin || '*')
  response.header('Access-Control-Allow-Headers', 'Content-Type')
  response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  return next()
})

app.get('/api/health', async (_request, response) => {
  if (!pool) return response.json({ status: 'ok', database: 'not configured' })
  try {
    await pool.query('select 1')
    return response.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    console.error('Database health check failed:', error.message)
    return response.status(503).json({ status: 'error', database: 'unavailable' })
  }
})

app.post('/api/reports', async (request, response) => {
  if (!pool) return response.status(503).json({ message: 'Database is not configured. Set DATABASE_URL before submitting reports.' })
  const { title, description, category, location, evidenceName, evidenceData } = request.body
  if (!title || !description || !category || !location) {
    return response.status(400).json({ message: 'Title, description, category, and location are required.' })
  }
  try {
    const evidence = evidenceData ? Buffer.from(evidenceData.split(',')[1] || '', 'base64') : null
    const result = await pool.query(
      `INSERT INTO reports (title, category, description, location, evidence_name, evidence_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, reference, title, category, description, location, evidence_name, status, created_at`,
      [title, category, description, location, evidenceName || null, evidence],
    )
    return response.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Report creation failed:', error.message)
    return response.status(500).json({ message: 'The report could not be saved. Please try again.' })
  }
})

app.get('/api/reports', async (_request, response) => {
  if (!pool) return response.status(503).json({ message: 'Database is not configured.' })
  try {
    const result = await pool.query(
      `SELECT id, reference, title, category, location, status, created_at
       FROM reports ORDER BY created_at DESC`,
    )
    return response.json(result.rows)
  } catch (error) {
    console.error('Report lookup failed:', error.message)
    return response.status(500).json({ message: 'Reports could not be loaded.' })
  }
})

app.listen(port, () => console.log(`ReportHub API listening on http://localhost:${port}`))
