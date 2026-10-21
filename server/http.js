export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

export function parsePagination(query) {
  const page = parsePositiveInteger(query.page, 1, 1000000)
  const pageSize = parsePositiveInteger(query.pageSize, 20, 100)
  const offset = (page - 1) * pageSize

  return {
    page,
    pageSize,
    limit: pageSize,
    offset,
  }
}

export function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (!/^\d+$/.test(String(value))) {
    throw new HttpError(400, 'A numeric value was expected.')
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new HttpError(400, 'A positive numeric value was expected.')
  }

  return parsed
}

export function parseOptionalId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (!/^\d+$/.test(String(value))) {
    throw new HttpError(400, `${fieldName} must be a numeric identifier.`)
  }

  return String(value)
}

export function parseSort(query, allowed, defaultSort) {
  const sortBy = String(query.sortBy ?? defaultSort.field)
  const sortDir = String(query.sortDir ?? defaultSort.direction).toLowerCase()

  if (!Object.hasOwn(allowed, sortBy)) {
    throw new HttpError(400, 'Unsupported sort field.')
  }

  if (sortDir !== 'asc' && sortDir !== 'desc') {
    throw new HttpError(400, 'sortDir must be asc or desc.')
  }

  return {
    expression: allowed[sortBy],
    direction: sortDir.toUpperCase(),
  }
}

export function parseBoolean(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (value === true || value === 'true' || value === '1') {
    return true
  }

  if (value === false || value === 'false' || value === '0') {
    return false
  }

  throw new HttpError(400, `${fieldName} must be true or false.`)
}

export function parseDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const date = new Date(String(value))

  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${fieldName} must be a valid date.`)
  }

  return date.toISOString()
}

export function requireText(value, fieldName, maximumLength) {
  const text = typeof value === 'string' ? value.trim() : ''

  if (!text) {
    throw new HttpError(400, `${fieldName} is required.`)
  }

  if (maximumLength && text.length > maximumLength) {
    throw new HttpError(400, `${fieldName} must be at most ${maximumLength} characters.`)
  }

  return text
}

export function optionalText(value, maximumLength) {
  if (value === undefined || value === null) {
    return null
  }

  const text = String(value).trim()

  if (!text) {
    return null
  }

  if (maximumLength && text.length > maximumLength) {
    throw new HttpError(400, `The value must be at most ${maximumLength} characters.`)
  }

  return text
}

export function parseCoordinate(value, fieldName, minimum, maximum) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const coordinate = Number(value)

  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    throw new HttpError(400, `${fieldName} is outside the valid range.`)
  }

  return coordinate
}

export function mapPagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}
