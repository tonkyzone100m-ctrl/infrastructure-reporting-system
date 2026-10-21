function normalizeAuditValue(value) {
  if (value === undefined) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'bigint') {
    return String(value)
  }

  return value
}

export async function createAuditEntry(client, {
  actorId,
  action,
  entityType,
  entityId,
  details = {},
}) {
  await client.query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(details)],
  )
}

export async function auditFieldChanges(client, {
  actorId,
  entityType,
  entityId,
  changes,
}) {
  for (const [field, change] of Object.entries(changes)) {
    const oldValue = normalizeAuditValue(change.oldValue)
    const newValue = normalizeAuditValue(change.newValue)

    if (oldValue === newValue) {
      continue
    }

    await createAuditEntry(client, {
      actorId,
      action: `${entityType}.${field}_changed`,
      entityType,
      entityId,
      details: {
        field,
        old: oldValue,
        new: newValue,
      },
    })
  }
}
