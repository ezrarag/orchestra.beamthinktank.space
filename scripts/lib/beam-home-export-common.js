const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const admin = require('firebase-admin')

function loadServiceAccount(rootDir = process.cwd()) {
  const serviceAccountPath = path.join(rootDir, 'service-account.json')
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Missing service-account.json at ${serviceAccountPath}`)
  }

  try {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  } catch (error) {
    throw new Error(`Failed to parse service-account.json: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function initializeAdmin(rootDir = process.cwd()) {
  if (!admin.apps.length) {
    const serviceAccount = loadServiceAccount(rootDir)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })
  }

  return {
    admin,
    auth: admin.auth(),
    db: admin.firestore(),
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizePhone(value) {
  if (typeof value !== 'string') return ''
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `+1${digits}`
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`
  if (value.trim().startsWith('+')) return `+${digits}`
  return `+${digits}`
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function hashValue(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12)
}

function uniqueValues(values) {
  const seen = new Set()
  const out = []
  for (const value of values) {
    if (!value) continue
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function asIsoString(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value._seconds === 'number') return new Date(value._seconds * 1000).toISOString()
  return null
}

function safeJsonWrite(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function createDeterministicId(prefix, parts) {
  const cleaned = uniqueValues(parts.map((part) => slugify(part)).filter(Boolean))
  if (cleaned.length > 0) {
    return `${prefix}_${cleaned.slice(0, 3).join('_')}_${hashValue(cleaned.join('|'))}`
  }
  return `${prefix}_${hashValue(prefix)}`
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

module.exports = {
  asIsoString,
  createDeterministicId,
  hashValue,
  initializeAdmin,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  pickFirst,
  safeJsonWrite,
  slugify,
  toArray,
  uniqueValues,
}
