export const ADMIN_EMAIL_ALLOWLIST = [
  'ezra@readyaimgo.biz',
  'ezra.haugabrooks@gmail.com',
  'admin@local.dev'
]

export const ADMIN_GATEWAYS_DISABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ADMIN_AUTH_BYPASS === '1'

export function isAdminEmailAllowed(email: unknown): boolean {
  if (typeof email !== 'string') return false
  const norm = email.trim().toLowerCase()
  return ADMIN_EMAIL_ALLOWLIST.some(e => e.toLowerCase() === norm)
}
