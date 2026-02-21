import type { PortalPath } from '@/lib/types/portal'

export function resolvePortalPath(path: PortalPath, ngo?: string, scoped = false): string {
  const scopeEligible: PortalPath[] = ['/home', '/studio/recordings', '/projects', '/dashboard', '/admin']
  if (scoped && ngo) {
    if (!scopeEligible.includes(path)) {
      return path
    }
    return `/${ngo}${path}`
  }
  return path
}
