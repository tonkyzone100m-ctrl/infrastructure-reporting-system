import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

import bcrypt from 'bcryptjs'

import { HttpError } from './http.js'

const TOKEN_ISSUER = 'reporthub-api'
const TOKEN_TTL_SECONDS = 8 * 60 * 60

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim()

  if (!secret || secret.length < 32) {
    throw new HttpError(503, 'JWT_SECRET is not configured with a secure value.')
  }

  return secret
}

function signRawToken(value) {
  return createHmac('sha256', getJwtSecret())
    .update(value)
    .digest()
}

export function signUserToken(user, expiresInSeconds = TOKEN_TTL_SECONDS) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const payload = {
    sub: String(user.id),
    role: user.role,
    name: user.name,
    email: user.email,
    iss: TOKEN_ISSUER,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  }

  const encodedHeader = encodeBase64Url(JSON.stringify(header))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const signature = signRawToken(unsigned).toString('base64url')

  return `${unsigned}.${signature}`
}

export function verifyUserToken(token) {
  const parts = String(token).split('.')

  if (parts.length !== 3) {
    throw new HttpError(401, 'Invalid authentication token.')
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = signRawToken(unsigned)
  const receivedSignature = Buffer.from(encodedSignature, 'base64url')

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new HttpError(401, 'Invalid authentication token.')
  }

  let header
  let payload

  try {
    header = JSON.parse(decodeBase64Url(encodedHeader))
    payload = JSON.parse(decodeBase64Url(encodedPayload))
  } catch {
    throw new HttpError(401, 'Invalid authentication token.')
  }

  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw new HttpError(401, 'Unsupported authentication token.')
  }

  if (payload.iss !== TOKEN_ISSUER || !payload.sub) {
    throw new HttpError(401, 'Invalid authentication token.')
  }

  if (!Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'Authentication token has expired.')
  }

  return payload
}

export function extractBearerToken(request) {
  const header = request.headers.authorization ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)

  return match ? match[1].trim() : null
}

export function serializeUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    role_full: user.role_full ?? null,
    department_id: user.department_id === null || user.department_id === undefined
      ? null
      : String(user.department_id),
    created_at: user.created_at,
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}
