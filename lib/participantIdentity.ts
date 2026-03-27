const ROLE_PRIORITY = ['admin_staff', 'recruit_mentor', 'perform', 'publisher'] as const

function normalizeRoleValue(value: string): string {
  return value.trim()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeEmailList(emails: Array<string | null | undefined>): string[] {
  const unique = new Set<string>()

  emails.forEach((email) => {
    if (typeof email !== 'string') return
    const normalized = normalizeEmail(email)
    if (!normalized) return
    unique.add(normalized)
  })

  return Array.from(unique)
}

export function parseEmailList(value: string): string[] {
  return normalizeEmailList(value.split(/[\n,;]+/))
}

export function sortParticipantRoles(roles: string[]): string[] {
  const ordered = Array.from(new Set(roles.map(normalizeRoleValue).filter(Boolean)))

  return ordered.sort((left, right) => {
    const leftPriority = ROLE_PRIORITY.indexOf(left as (typeof ROLE_PRIORITY)[number])
    const rightPriority = ROLE_PRIORITY.indexOf(right as (typeof ROLE_PRIORITY)[number])

    if (leftPriority === -1 && rightPriority === -1) return 0
    if (leftPriority === -1) return 1
    if (rightPriority === -1) return -1
    return leftPriority - rightPriority
  })
}

export function readParticipantRoles(input: { role?: unknown; roles?: unknown } | null | undefined): string[] {
  if (!input) return []

  const roleList = Array.isArray(input.roles)
    ? input.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
    : []

  if (roleList.length > 0) {
    return sortParticipantRoles(roleList)
  }

  if (typeof input.role === 'string' && input.role.trim()) {
    return sortParticipantRoles([input.role])
  }

  return []
}

export function mergeParticipantRoles(
  existing: { role?: unknown; roles?: unknown } | string[] | null | undefined,
  nextRoles: Array<string | null | undefined>,
): string[] {
  const existingRoles = Array.isArray(existing)
    ? existing.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
    : readParticipantRoles(existing)

  return sortParticipantRoles([...existingRoles, ...nextRoles.filter((role): role is string => typeof role === 'string')])
}

export function resolvePrimaryParticipantRole(roles: string[]): string | null {
  return sortParticipantRoles(roles)[0] ?? null
}
