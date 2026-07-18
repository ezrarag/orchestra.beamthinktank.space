import { NextResponse } from 'next/server'
import { adminAuth, adminDb, isAdminSDKAvailable } from '@/lib/firebase-admin'
import { ADMIN_EMAIL_ALLOWLIST, ADMIN_GATEWAYS_DISABLED } from '@/lib/config/adminAccess'

type AuditRow = {
  uid: string
  email: string
  displayName: string
  authRole: string
  beamAdmin: boolean
  partnerAdmin: boolean
  board: boolean
  userDocRole: string
  subscriber: boolean
  membershipRole: string
  membershipRoles: string[]
  bdsoRows: number
  sources: string[]
  lastSignIn: string
  createdAt: string
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function boolValue(value: unknown) {
  return value === true
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export async function GET() {
  if (!isAdminSDKAvailable() || !adminAuth || !adminDb) {
    return NextResponse.json(
      {
        success: false,
        gatewayDisabled: ADMIN_GATEWAYS_DISABLED,
        allowlist: ADMIN_EMAIL_ALLOWLIST,
        error: 'Firebase Admin SDK is not configured, so live member audit data is unavailable.',
        requiredEnv: ['FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_ADMIN_PRIVATE_KEY'],
      },
      { status: 503 },
    )
  }

  const [authPage, usersSnapshot, membershipsSnapshot, projectMusiciansSnapshot] = await Promise.all([
    adminAuth.listUsers(1000),
    adminDb.collection('users').get(),
    adminDb.collection('ngoMemberships').get(),
    adminDb.collection('projectMusicians').where('projectId', '==', 'black-diaspora-symphony').get(),
  ])

  const rowsByUid = new Map<string, AuditRow>()
  const rowsByEmail = new Map<string, AuditRow>()

  const ensureRow = (uid: string, email: string): AuditRow => {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = (uid ? rowsByUid.get(uid) : undefined) || (normalizedEmail ? rowsByEmail.get(normalizedEmail) : undefined)
    if (existing) return existing

    const row: AuditRow = {
      uid,
      email: normalizedEmail,
      displayName: '',
      authRole: '',
      beamAdmin: false,
      partnerAdmin: false,
      board: false,
      userDocRole: '',
      subscriber: false,
      membershipRole: '',
      membershipRoles: [],
      bdsoRows: 0,
      sources: [],
      lastSignIn: '',
      createdAt: '',
    }

    if (uid) rowsByUid.set(uid, row)
    if (normalizedEmail) rowsByEmail.set(normalizedEmail, row)
    return row
  }

  authPage.users.forEach((authUser) => {
    const claims = authUser.customClaims || {}
    const row = ensureRow(authUser.uid, authUser.email || '')
    row.displayName = authUser.displayName || row.displayName
    row.authRole = stringValue(claims.role)
    row.beamAdmin = boolValue(claims.beam_admin)
    row.partnerAdmin = boolValue(claims.partner_admin)
    row.board = boolValue(claims.board)
    row.lastSignIn = authUser.metadata.lastSignInTime || ''
    row.createdAt = authUser.metadata.creationTime || ''
    row.sources.push('auth')
  })

  usersSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const row = ensureRow(docSnap.id, stringValue(data.email))
    row.displayName = stringValue(data.displayName) || stringValue(data.name) || row.displayName
    row.userDocRole = stringValue(data.role)
    row.subscriber = boolValue(data.subscriber)
    row.sources.push('users')
  })

  membershipsSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const row = ensureRow(docSnap.id, stringValue(data.email))
    row.membershipRole = stringValue(data.role)
    row.membershipRoles = stringArray(data.roles)
    row.sources.push('ngoMemberships')
  })

  projectMusiciansSnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data()
    const uid = stringValue(data.musicianId) || stringValue(data.userId) || stringValue(data.uid)
    const row = ensureRow(uid || docSnap.id, stringValue(data.email))
    row.displayName = stringValue(data.name) || row.displayName
    row.bdsoRows += 1
    row.sources.push('projectMusicians')
  })

  const rows = Array.from(rowsByUid.values())
    .concat(Array.from(rowsByEmail.values()).filter((row) => !row.uid))
    .map((row) => ({
      ...row,
      sources: Array.from(new Set(row.sources)).sort(),
      effectiveAdmin:
        row.beamAdmin ||
        row.authRole === 'beam_admin' ||
        row.userDocRole === 'beam_admin' ||
        ADMIN_EMAIL_ALLOWLIST.includes(row.email),
      allowlisted: ADMIN_EMAIL_ALLOWLIST.includes(row.email),
    }))
    .sort((a, b) => {
      const aLabel = a.email || a.displayName || a.uid
      const bLabel = b.email || b.displayName || b.uid
      return aLabel.localeCompare(bLabel)
    })

  return NextResponse.json({
    success: true,
    gatewayDisabled: ADMIN_GATEWAYS_DISABLED,
    allowlist: ADMIN_EMAIL_ALLOWLIST,
    counts: {
      authUsers: authPage.users.length,
      userDocs: usersSnapshot.size,
      memberships: membershipsSnapshot.size,
      bdsoProjectMusicians: projectMusiciansSnapshot.size,
      rows: rows.length,
      effectiveAdmins: rows.filter((row) => row.effectiveAdmin).length,
    },
    rows,
  })
}
