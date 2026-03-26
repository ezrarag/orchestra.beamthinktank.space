import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb, verifyAdminRole } from '@/lib/firebase-admin'
import { sendSlackAdminNoteNotification } from '@/lib/slack'

const adminAuthBypassEnabled =
  process.env.NEXT_PUBLIC_ADMIN_AUTH_BYPASS === '1' ||
  (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ADMIN_AUTH_BYPASS !== '0')

function normalizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : ''
}

async function authenticateAdmin(request: NextRequest) {
  if (adminAuthBypassEnabled) {
    return {
      decodedToken: {
        uid: 'local-admin-bypass',
        email: 'admin@local.dev',
      },
      role: 'beam_admin',
      error: null as NextResponse | null,
    }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'No authorization token provided' }, { status: 401 }) as NextResponse }
  }

  if (!adminAuth) {
    return { error: NextResponse.json({ error: 'Authentication service not initialized' }, { status: 500 }) as NextResponse }
  }

  const token = authHeader.split('Bearer ')[1]
  const decodedToken = await adminAuth.verifyIdToken(token)
  const tokenClaims = decodedToken as Record<string, unknown>
  const role = typeof tokenClaims.role === 'string' ? tokenClaims.role : ''
  const isPartnerAdmin = role === 'partner_admin' || tokenClaims.partner_admin === true
  const isBeamAdminFromClaims = role === 'beam_admin' || tokenClaims.beam_admin === true
  const isBeamAdmin = isBeamAdminFromClaims || (await verifyAdminRole(decodedToken.uid))
  const isAdmin = isBeamAdmin || isPartnerAdmin

  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'Insufficient permissions. Admin role required.' }, { status: 403 }) as NextResponse }
  }

  return {
    decodedToken,
    role: isPartnerAdmin ? 'partner_admin' : 'beam_admin',
    error: null as NextResponse | null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if (auth.error) {
      return auth.error
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
    }

    const limitParam = Number(new URL(request.url).searchParams.get('limit') || '20')
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20

    const snapshot = await adminDb
      .collection('adminSlackNotes')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const notes = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || '',
        note: data.note || '',
        contextPage: data.contextPage || '',
        adminUid: data.adminUid || '',
        adminEmail: data.adminEmail || '',
        adminRole: data.adminRole || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        slackStatus: data.slack?.status || 'unknown',
        slackError: data.slack?.error || '',
      }
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching admin Slack notes:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch Slack notes.',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request)
    if (auth.error) {
      return auth.error
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 })
    }

    const body = await request.json()
    const title = normalizeText(body?.title)
    const note = normalizeText(body?.note)
    const contextPage = normalizeText(body?.contextPage)

    if (title.length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters.' }, { status: 400 })
    }

    if (note.length < 5) {
      return NextResponse.json({ error: 'Note must be at least 5 characters.' }, { status: 400 })
    }

    const noteRef = adminDb.collection('adminSlackNotes').doc()
    const decodedToken = auth.decodedToken!
    const adminEmail = decodedToken.email || 'Unknown'
    const adminUid = decodedToken.uid

    await noteRef.set({
      title,
      note,
      contextPage,
      adminUid,
      adminEmail,
      adminRole: auth.role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      slack: {
        status: 'pending',
      },
    })

    try {
      await sendSlackAdminNoteNotification({
        title,
        note,
        contextPage,
        adminEmail,
        adminUid,
      })

      await noteRef.update({
        updatedAt: FieldValue.serverTimestamp(),
        slack: {
          status: 'sent',
          sentAt: FieldValue.serverTimestamp(),
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Slack note sent.',
        noteId: noteRef.id,
      })
    } catch (slackError) {
      const details = slackError instanceof Error ? slackError.message : 'Slack send failed'
      await noteRef.update({
        updatedAt: FieldValue.serverTimestamp(),
        slack: {
          status: 'failed',
          error: details,
        },
      })

      return NextResponse.json(
        {
          error: details,
          noteId: noteRef.id,
        },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error('Error sending admin Slack note:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send Slack note.',
      },
      { status: 500 },
    )
  }
}
