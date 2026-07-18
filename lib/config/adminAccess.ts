export const ADMIN_EMAIL_ALLOWLIST = ['ezra@readyaimgo.biz']

export function isAdminEmailAllowed(email: unknown): boolean {
  return typeof email === 'string' && ADMIN_EMAIL_ALLOWLIST.includes(email.trim().toLowerCase())
}
