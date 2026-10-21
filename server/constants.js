export const REPORT_STATUSES = Object.freeze([
  'Received',
  'In progress',
  'Resolved',
])

export const REPORT_PRIORITIES = Object.freeze([
  'Low',
  'Medium',
  'High',
  'Critical',
])

export const REPORT_CATEGORIES = Object.freeze([
  'Public spaces',
  'Roads & pavements',
  'Street lighting',
  'Water & drainage',
])

export const REPORT_DEFAULT_STATUS = 'Received'
export const REPORT_DEFAULT_PRIORITY = 'Medium'

export const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  DEPARTMENT_MANAGER: 'department_manager',
  FIELD_STAFF: 'field_staff',
  AUDITOR: 'auditor',
})

export const ROLE_VALUES = Object.freeze([
  ROLES.CITIZEN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.DEPARTMENT_MANAGER,
  ROLES.FIELD_STAFF,
  ROLES.AUDITOR,
])

export const ADMIN_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
])

export const STAFF_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.DEPARTMENT_MANAGER,
  ROLES.FIELD_STAFF,
  ROLES.AUDITOR,
])

export const REPORT_MANAGE_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.DEPARTMENT_MANAGER,
])

export const AUDIT_VIEW_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.AUDITOR,
])

export const MAX_COMMENT_LENGTH = 2000
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
export const SLA_DUE_SOON_HOURS = 24
