import { resolvePortalPath } from '@/lib/portal/routes'

export type ParticipantIntent = 'perform' | 'recruit_mentor' | 'admin_staff'

const INTENT_LABELS: Record<ParticipantIntent, string> = {
  perform: 'performer',
  recruit_mentor: 'recruiter and mentor',
  admin_staff: 'admin / staff member',
}

export function isParticipantIntent(value: string | null | undefined): value is ParticipantIntent {
  return value === 'perform' || value === 'recruit_mentor' || value === 'admin_staff'
}

export function getParticipantIntentLabel(intent: ParticipantIntent): string {
  return INTENT_LABELS[intent]
}

export function resolveParticipantIntentDestination(ngo: string, intent: ParticipantIntent): string {
  if (intent === 'admin_staff') {
    return '/join/admin-staff'
  }

  return resolvePortalPath('/dashboard', ngo, false)
}
