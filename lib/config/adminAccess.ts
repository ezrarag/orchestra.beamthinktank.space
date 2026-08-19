export const ADMIN_EMAIL_ALLOWLIST = ['ezra@readyaimgo.biz']
export const ADMIN_GATEWAYS_DISABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ADMIN_AUTH_BYPASS === '1'

export function isAdminEmailAllowed(email: unknown): boolean {
  return typeof email === 'string' && ADMIN_EMAIL_ALLOWLIST.includes(email.trim().toLowerCase())
}
