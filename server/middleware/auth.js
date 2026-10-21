import {
  extractBearerToken,
  serializeUser,
  verifyUserToken,
} from '../auth.js'

import { query } from '../db.js'
import { HttpError } from '../http.js'

async function authenticate(request) {
  const token = extractBearerToken(request)

  if (!token) {
    throw new HttpError(401, 'Authentication is required.')
  }

  const payload = verifyUserToken(token)

  if (!/^\d+$/.test(String(payload.sub))) {
    throw new HttpError(401, 'Invalid authentication token.')
  }

  const result = await query(
    `SELECT id, name, email, role, role_full, department_id, created_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [payload.sub],
  )

  if (result.rows.length === 0) {
    throw new HttpError(401, 'The authenticated account no longer exists.')
  }

  return serializeUser(result.rows[0])
}

export function requireAuth(request, _response, next) {
  authenticate(request)
    .then((user) => {
      request.user = user
      next()
    })
    .catch(next)
}

export function requireRoles(...roles) {
  const allowedRoles = new Set(roles)

  return (request, _response, next) => {
    authenticate(request)
      .then((user) => {
        if (!allowedRoles.has(user.role)) {
          throw new HttpError(403, 'You are not authorized to perform this action.')
        }

        request.user = user
        next()
      })
      .catch(next)
  }
}
