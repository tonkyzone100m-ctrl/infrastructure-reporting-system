import pg from 'pg'

import { HttpError } from './http.js'

const connectionString = process.env.DATABASE_URL?.trim()

export const pool = connectionString
  ? new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null

if (pool) {
  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message)
  })
}

export function getPool() {
  if (!pool) {
    throw new HttpError(503, 'Database is not configured. Set DATABASE_URL.')
  }

  return pool
}

export async function query(text, parameters = []) {
  return getPool().query(text, parameters)
}

export async function withTransaction(work) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('PostgreSQL rollback failed:', rollbackError.message)
    }

    throw error
  } finally {
    client.release()
  }
}

export async function checkDatabase() {
  if (!pool) {
    return {
      configured: false,
      connected: false,
    }
  }

  try {
    await pool.query('select 1')
    return {
      configured: true,
      connected: true,
    }
  } catch (error) {
    console.error('Database health check failed:', error.message)
    return {
      configured: true,
      connected: false,
    }
  }
}

export async function closeDatabase() {
  if (!pool) {
    return
  }

  await pool.end()
}
