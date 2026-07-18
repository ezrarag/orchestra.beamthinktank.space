import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import {
  INSTITUTION_ACCOUNTS_COLLECTION,
  INSTITUTION_PROJECTS_COLLECTION,
  normalizeInstitutionAccount,
  normalizeInstitutionProject,
} from '@/lib/api/institutions'
import { isAdminEmailAllowed } from '@/lib/config/adminAccess'

async function authorize(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true as const }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false as const, status: 401, error: 'No authorization token provided' }
  }
  if (!adminAuth) {
    return { ok: false as const, status: 500, error: 'Authentication service not initialized' }
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)
    const claims = decoded as Record<string, unknown>
    const isAdmin = claims.role === 'beam_admin' || claims.beam_admin === true || isAdminEmailAllowed(claims.email)
    if (!isAdmin) return { ok: false as const, status: 403, error: 'Insufficient permissions' }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Invalid authorization token' }
  }
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!adminDb) return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })

  try {
    const [accountsSnapshot, projectsSnapshot] = await Promise.all([
      adminDb.collection(INSTITUTION_ACCOUNTS_COLLECTION).get(),
      adminDb.collection(INSTITUTION_PROJECTS_COLLECTION).get(),
    ])

    const accounts = accountsSnapshot.docs
      .map((docSnap) => normalizeInstitutionAccount(docSnap.id, docSnap.data()))
      .sort((a, b) => a.name.localeCompare(b.name))
    const projects = projectsSnapshot.docs
      .map((docSnap) => normalizeInstitutionProject(docSnap.id, docSnap.data()))
      .sort((a, b) => a.title.localeCompare(b.title))

    return NextResponse.json({ accounts, projects })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load institution records', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!adminDb) return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })

  try {
    const body = await request.json()
    const kind = typeof body.kind === 'string' ? body.kind : ''
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (kind === 'account') {
      const contactEmails = cleanStringArray(body.contactEmails).map((email) => email.toLowerCase())
      const emailDomains = cleanStringArray(body.emailDomains).map((domain) => domain.toLowerCase())
      const projectIds = cleanStringArray(body.projectIds)
      await adminDb.collection(INSTITUTION_ACCOUNTS_COLLECTION).doc(id).set(
        {
          name: typeof body.name === 'string' ? body.name.trim() : id,
          shortName: typeof body.shortName === 'string' ? body.shortName.trim() : '',
          status: body.status === 'active' || body.status === 'paused' ? body.status : 'pending',
          type: typeof body.type === 'string' ? body.type : 'partner',
          city: typeof body.city === 'string' ? body.city.trim() : '',
          state: typeof body.state === 'string' ? body.state.trim() : '',
          website: typeof body.website === 'string' ? body.website.trim() : '',
          contactEmails,
          emailDomains,
          userIds: cleanStringArray(body.userIds),
          projectIds,
          contacts: Array.isArray(body.contacts) ? body.contacts : [],
          dashboardSummary: typeof body.dashboardSummary === 'string' ? body.dashboardSummary.trim() : '',
          notes: typeof body.notes === 'string' ? body.notes.trim() : '',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return NextResponse.json({ success: true, id, kind })
    }

    if (kind === 'project') {
      const institutionId = typeof body.institutionId === 'string' ? body.institutionId.trim() : ''
      if (!institutionId) {
        return NextResponse.json({ error: 'institutionId is required for projects' }, { status: 400 })
      }

      await adminDb.collection(INSTITUTION_PROJECTS_COLLECTION).doc(id).set(
        {
          institutionId,
          projectId: typeof body.projectId === 'string' ? body.projectId.trim() : 'black-diaspora-symphony',
          title: typeof body.title === 'string' ? body.title.trim() : id,
          status:
            body.status === 'active' || body.status === 'completed' || body.status === 'paused'
              ? body.status
              : 'planning',
          summary: typeof body.summary === 'string' ? body.summary.trim() : '',
          location: typeof body.location === 'string' ? body.location.trim() : '',
          performanceDate: typeof body.performanceDate === 'string' ? body.performanceDate.trim() : '',
          rehearsalWindow: typeof body.rehearsalWindow === 'string' ? body.rehearsalWindow.trim() : '',
          rosterTarget: Number.isFinite(body.rosterTarget) ? body.rosterTarget : null,
          confirmedMusicians: Number.isFinite(body.confirmedMusicians) ? body.confirmedMusicians : null,
          prospectCount: Number.isFinite(body.prospectCount) ? body.prospectCount : null,
          mediaCount: Number.isFinite(body.mediaCount) ? body.mediaCount : null,
          nextActions: cleanStringArray(body.nextActions),
          programHighlights: cleanStringArray(body.programHighlights),
          milestones: Array.isArray(body.milestones) ? body.milestones : [],
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      return NextResponse.json({ success: true, id, kind })
    }

    return NextResponse.json({ error: 'kind must be account or project' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save institution record', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
