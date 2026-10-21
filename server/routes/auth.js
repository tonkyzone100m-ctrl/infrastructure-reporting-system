import { Router } from 'express'

import {
  comparePassword,
  hashPassword,
  serializeUser,
  signUserToken,
} from '../auth.js'
import { query } from '../db.js'
import { HttpError, requireText } from '../http.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function validateEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw new HttpError(400, 'A valid email address is required.')
  }
}

router.post('/login', async (request, response) => {
  const email = normalizeEmail(request.body?.email)
  const password = String(request.body?.password ?? '')

  if (!email || !password) {
    throw new HttpError(400, 'Email and password are required.')
  }

  const result = await query(
    `SELECT id, name, email, role, role_full, department_id, created_at, password_hash
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  )

  const user = result.rows[0]

  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password.')
  }

  const serializedUser = serializeUser(user)
  const token = signUserToken(serializedUser)

  response.json({
    data: {
      token,
      user: serializedUser,
    },
  })
})

router.post('/register', async (request, response) => {
  const name = requireText(request.body?.name, 'Name', 120)
  const email = normalizeEmail(request.body?.email)
  const password = String(request.body?.password ?? '')

  validateEmail(email)

  if (password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'Password must be between 8 and 128 characters.')
  }

  const passwordHash = await hashPassword(password)

  let user

  try {
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, role_full)
       VALUES ($1, $2, $3, 'citizen', 'citizen')
       RETURNING id, name, email, role, role_full, department_id, created_at`,
      [name, email, passwordHash],
    )

    user = result.rows[0]
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'An account with that email already exists.')
    }

    throw error
  }

  response.status(201).json({
    data: {
      user: serializeUser(user),
    },
  })
})

router.get('/me', requireAuth, (request, response) => {
  response.json({
    data: {
      user: request.user,
    },
  })
})

router.post('/logout', requireAuth, (_request, response) => {
  response.status(204).end()
})

export default router
