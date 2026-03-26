#!/usr/bin/env node

const path = require('path')
const {
  asIsoString,
  createDeterministicId,
  initializeAdmin,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  pickFirst,
  safeJsonWrite,
  toArray,
  uniqueValues,
} = require('./lib/beam-home-export-common')

const DEFAULT_PROJECT_ID = 'black-diaspora-symphony'
const DEFAULT_ORGANIZATION_ID = 'org_beam_orchestra'
const DEFAULT_COHORT_ID = 'cohort_black_diaspora_symphony'
const DEFAULT_OUTPUT_PATH = path.join(process.cwd(), 'tmp', 'migrations', 'bdso-participants-beam-home-export.json')

function parseArgs(argv) {
  const options = {
    projectId: DEFAULT_PROJECT_ID,
    organizationId: DEFAULT_ORGANIZATION_ID,
    cohortId: DEFAULT_COHORT_ID,
    outputPath: DEFAULT_OUTPUT_PATH,
    includeAdminStaff: false,
    includeTests: false,
    stdout: false,
  }

  argv.forEach((arg) => {
    if (arg === '--include-admin-staff') options.includeAdminStaff = true
    else if (arg === '--include-tests') options.includeTests = true
    else if (arg === '--stdout') options.stdout = true
    else if (arg.startsWith('--projectId=')) options.projectId = arg.split('=')[1] || DEFAULT_PROJECT_ID
    else if (arg.startsWith('--organizationId=')) options.organizationId = arg.split('=')[1] || DEFAULT_ORGANIZATION_ID
    else if (arg.startsWith('--cohortId=')) options.cohortId = arg.split('=')[1] || DEFAULT_COHORT_ID
    else if (arg.startsWith('--out=')) options.outputPath = path.resolve(arg.split('=')[1] || DEFAULT_OUTPUT_PATH)
  })

  return options
}

function indexBy(items, selector) {
  const map = new Map()
  items.forEach((item) => {
    const key = selector(item)
    if (!key) return
    map.set(key, item)
  })
  return map
}

function indexMany(items, selector) {
  const map = new Map()
  items.forEach((item) => {
    const key = selector(item)
    if (!key) return
    const bucket = map.get(key) || []
    bucket.push(item)
    map.set(key, bucket)
  })
  return map
}

function mapRosterStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()
  if (normalized === 'confirmed') return 'active'
  if (normalized === 'pending' || normalized === 'interested') return 'pending'
  if (normalized === 'dropped' || normalized === 'declined') return 'inactive'
  return 'pending'
}

function looksLikeTestRecord(record) {
  const haystack = [
    record?.name,
    record?.email,
    record?.source,
    record?.notes,
    record?.submissionDisplayName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return /\btest\b/.test(haystack)
}

function looksLikePlaceholder(record) {
  const haystack = [record?.name, record?.instrument, record?.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return /\btbd\b/.test(haystack) || /\bplaceholder\b/.test(haystack) || /\bopen\b/.test(String(record?.status || '').toLowerCase())
}

function collectEmails(...records) {
  const emails = []
  records.forEach((record) => {
    if (!record) return
    const values = Array.isArray(record.emails) ? record.emails : [record.email]
    values.forEach((value) => {
      const normalized = normalizeEmail(value)
      if (normalized) emails.push(normalized)
    })
  })
  return uniqueValues(emails)
}

function collectPhones(...records) {
  const phones = []
  records.forEach((record) => {
    if (!record) return
    const values = Array.isArray(record.phones) ? record.phones : [record.phone, record.phoneNumber]
    values.forEach((value) => {
      const normalized = normalizePhone(value)
      if (normalized) phones.push(normalized)
    })
  })
  return uniqueValues(phones)
}

function createManualReviewEntry(participantProfileId, rosterRecord, reasons, candidateMatches) {
  return {
    id: createDeterministicId('manual_review', [participantProfileId, ...reasons]),
    participantProfileId,
    reasons: uniqueValues(reasons),
    source: {
      collection: 'projectMusicians',
      documentId: rosterRecord.id,
      projectId: rosterRecord.projectId || null,
      name: rosterRecord.name || null,
      email: rosterRecord.email || null,
      phone: rosterRecord.phone || null,
      instrument: rosterRecord.instrument || null,
      status: rosterRecord.status || null,
    },
    candidateMatches,
  }
}

async function fetchCollectionDocs(db, collectionName) {
  const snapshot = await db.collection(collectionName).get()
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

async function listAuthUsers(auth) {
  const users = []
  let nextPageToken = undefined

  do {
    const response = await auth.listUsers(1000, nextPageToken)
    response.users.forEach((user) => {
      users.push({
        uid: user.uid,
        email: normalizeEmail(user.email),
        displayName: user.displayName || null,
        phone: normalizePhone(user.phoneNumber),
        phoneNumber: user.phoneNumber || null,
        emailVerified: Boolean(user.emailVerified),
        disabled: Boolean(user.disabled),
        providers: user.providerData.map((provider) => provider.providerId).filter(Boolean),
        claims: user.customClaims || {},
      })
    })
    nextPageToken = response.pageToken
  } while (nextPageToken)

  return users
}

function buildCandidateMatches(rosterRecord, indexes) {
  const nameKey = normalizeName(rosterRecord.name)
  const instrumentKey = String(rosterRecord.instrument || '').trim().toLowerCase()
  const candidateMatches = []

  const musicianNameMatches = (indexes.musiciansByName.get(nameKey) || []).filter(Boolean)
  musicianNameMatches.forEach((candidate) => {
    candidateMatches.push({
      collection: 'musicians',
      documentId: candidate.id,
      name: candidate.name || null,
      email: candidate.email || null,
      instrument: candidate.instrument || null,
      reason: instrumentKey && String(candidate.instrument || '').trim().toLowerCase() === instrumentKey
        ? 'name+instrument'
        : 'name',
    })
  })

  const userNameMatches = (indexes.usersByName.get(nameKey) || []).filter(Boolean)
  userNameMatches.forEach((candidate) => {
    candidateMatches.push({
      collection: 'users',
      documentId: candidate.id,
      name: candidate.name || null,
      email: candidate.email || null,
      instrument: candidate.instrument || null,
      reason: 'name',
    })
  })

  return uniqueValues(
    candidateMatches.map((candidate) => JSON.stringify(candidate)),
  ).map((value) => JSON.parse(value))
}

function resolveIdentity(rosterRecord, indexes) {
  const normalizedEmail = normalizeEmail(rosterRecord.email)
  const normalizedPhone = normalizePhone(rosterRecord.phone)

  let matchMethod = 'manual_review'
  let authUser = null
  let userDoc = null
  let musicianDoc = null
  let prospectDocs = []

  if (rosterRecord.musicianId && indexes.authByUid.has(rosterRecord.musicianId)) {
    authUser = indexes.authByUid.get(rosterRecord.musicianId)
    matchMethod = 'auth.uid'
  } else if (normalizedEmail && indexes.authByEmail.has(normalizedEmail)) {
    authUser = indexes.authByEmail.get(normalizedEmail)
    matchMethod = 'normalized_email'
  } else if (normalizedPhone && indexes.authByPhone.has(normalizedPhone)) {
    authUser = indexes.authByPhone.get(normalizedPhone)
    matchMethod = 'normalized_phone'
  }

  if (authUser) {
    userDoc = indexes.usersByUid.get(authUser.uid) || null
    musicianDoc = indexes.musiciansByUid.get(authUser.uid) || null
  }

  if (!userDoc && normalizedEmail && indexes.usersByEmail.has(normalizedEmail)) {
    userDoc = indexes.usersByEmail.get(normalizedEmail)
    if (matchMethod === 'manual_review') matchMethod = 'normalized_email'
  }
  if (!userDoc && normalizedPhone && indexes.usersByPhone.has(normalizedPhone)) {
    userDoc = indexes.usersByPhone.get(normalizedPhone)
    if (matchMethod === 'manual_review') matchMethod = 'normalized_phone'
  }

  if (!musicianDoc && normalizedEmail && indexes.musiciansByEmail.has(normalizedEmail)) {
    musicianDoc = indexes.musiciansByEmail.get(normalizedEmail)
    if (matchMethod === 'manual_review') matchMethod = 'normalized_email'
  }
  if (!musicianDoc && normalizedPhone && indexes.musiciansByPhone.has(normalizedPhone)) {
    musicianDoc = indexes.musiciansByPhone.get(normalizedPhone)
    if (matchMethod === 'manual_review') matchMethod = 'normalized_phone'
  }

  if (!authUser && userDoc && indexes.authByUid.has(userDoc.id)) {
    authUser = indexes.authByUid.get(userDoc.id)
  }
  if (!authUser && musicianDoc && indexes.authByUid.has(musicianDoc.id)) {
    authUser = indexes.authByUid.get(musicianDoc.id)
  }
  if (!userDoc && authUser && indexes.usersByUid.has(authUser.uid)) {
    userDoc = indexes.usersByUid.get(authUser.uid)
  }
  if (!musicianDoc && authUser && indexes.musiciansByUid.has(authUser.uid)) {
    musicianDoc = indexes.musiciansByUid.get(authUser.uid)
  }

  if (normalizedEmail && indexes.prospectsByEmail.has(normalizedEmail)) {
    prospectDocs = indexes.prospectsByEmail.get(normalizedEmail)
      .filter((prospect) => prospect.projectId === rosterRecord.projectId)
  } else if (normalizedPhone && indexes.prospectsByPhone.has(normalizedPhone)) {
    prospectDocs = indexes.prospectsByPhone.get(normalizedPhone)
      .filter((prospect) => prospect.projectId === rosterRecord.projectId)
  }

  return {
    matchMethod,
    authUser,
    userDoc,
    musicianDoc,
    prospectDocs,
    candidateMatches: buildCandidateMatches(rosterRecord, indexes),
  }
}

function hasAdminSignals(identity) {
  const authClaims = identity.authUser?.claims || {}
  const userRole = String(identity.userDoc?.role || '')
  const rosterSource = String(identity.rosterRecord?.source || '').toLowerCase()
  const instrument = String(identity.rosterRecord?.instrument || '').toLowerCase()

  if (authClaims.beam_admin || authClaims.partner_admin) return true
  if (authClaims.role === 'beam_admin' || authClaims.role === 'partner_admin') return true
  if (userRole === 'beam_admin' || userRole === 'partner_admin') return true
  if (rosterSource.includes('founder') || rosterSource.includes('artistic director') || rosterSource.includes('staff')) return true
  if (instrument === 'conductor' && rosterSource.includes('founder')) return true
  return false
}

function buildParticipantProfileId(identity, rosterRecord) {
  if (identity.authUser?.uid) {
    return `participant_profile_auth_${identity.authUser.uid}`
  }

  const primaryEmail = normalizeEmail(
    pickFirst(identity.userDoc?.email, identity.musicianDoc?.email, rosterRecord.email),
  )
  if (primaryEmail) {
    return `participant_profile_email_${primaryEmail.replace(/[^a-z0-9]/g, '_')}`
  }

  const primaryPhone = normalizePhone(
    pickFirst(identity.userDoc?.phone, identity.musicianDoc?.phone, rosterRecord.phone),
  )
  if (primaryPhone) {
    return `participant_profile_phone_${primaryPhone.replace(/\W/g, '')}`
  }

  return createDeterministicId('participant_profile_manual', [
    rosterRecord.projectId,
    rosterRecord.name,
    rosterRecord.instrument,
  ])
}

function buildExportRows(rosterRecord, identity, options) {
  const participantProfileId = buildParticipantProfileId(identity, rosterRecord)
  const emails = collectEmails(rosterRecord, identity.authUser, identity.userDoc, identity.musicianDoc)
  const phones = collectPhones(rosterRecord, identity.authUser, identity.userDoc, identity.musicianDoc)
  const primaryEmail = normalizeEmail(
    pickFirst(identity.authUser?.email, identity.userDoc?.email, rosterRecord.email, identity.musicianDoc?.email),
  ) || null
  const primaryPhone = normalizePhone(
    pickFirst(identity.authUser?.phone, identity.userDoc?.phone, rosterRecord.phone, identity.musicianDoc?.phone),
  ) || null

  const manualReviewReasons = []
  if (identity.matchMethod === 'manual_review') manualReviewReasons.push('no_direct_uid_email_or_phone_match')
  if (!primaryEmail) manualReviewReasons.push('missing_primary_email')
  if (identity.candidateMatches.length > 0 && identity.matchMethod === 'manual_review') {
    manualReviewReasons.push('name_based_candidate_match_requires_review')
  }

  const conflictingSourceEmails = uniqueValues([
    normalizeEmail(rosterRecord.email),
    normalizeEmail(identity.userDoc?.email),
    normalizeEmail(identity.musicianDoc?.email),
    normalizeEmail(identity.authUser?.email),
  ]).filter(Boolean)
  if (conflictingSourceEmails.length > 1) {
    manualReviewReasons.push('conflicting_emails_across_sources')
  }
  if (identity.matchMethod === 'manual_review' && identity.candidateMatches.length > 1) {
    manualReviewReasons.push('multiple_candidate_matches')
  }

  const participantProfile = {
    id: participantProfileId,
    canonicalOrganizationId: options.organizationId,
    sourceSystem: 'beam_orchestra',
    authUid: identity.authUser?.uid || null,
    primaryEmail,
    emailAliases: emails.filter((email) => email !== primaryEmail),
    primaryPhone,
    phoneAliases: phones.filter((phone) => phone !== primaryPhone),
    fullName: pickFirst(identity.userDoc?.name, identity.musicianDoc?.name, rosterRecord.name, identity.authUser?.displayName),
    displayName: pickFirst(identity.authUser?.displayName, identity.userDoc?.name, rosterRecord.name),
    photoUrl: pickFirst(identity.userDoc?.photoURL, identity.musicianDoc?.headshotUrl),
    emailVerified: Boolean(identity.authUser?.emailVerified),
    authProviders: identity.authUser?.providers || [],
    homeInstitutionId: identity.userDoc?.institutionId || null,
    instruments: uniqueValues([
      rosterRecord.instrument || null,
      identity.userDoc?.instrument || null,
      identity.musicianDoc?.instrument || null,
    ].filter(Boolean)),
    profileStatus: mapRosterStatus(rosterRecord.status),
    manualReview: manualReviewReasons.length > 0,
    manualReviewReasons,
    idempotencyKey: `beam_orchestra:projectMusicians:${rosterRecord.id}`,
    sourceSnapshot: {
      projectId: rosterRecord.projectId || null,
      rosterStatus: rosterRecord.status || null,
      rosterRole: rosterRecord.role || null,
    },
  }

  const organizationMembership = {
    id: createDeterministicId('organization_membership', [options.organizationId, participantProfileId]),
    organizationId: options.organizationId,
    participantProfileId,
    membershipStatus: mapRosterStatus(rosterRecord.status),
    roles: ['participant'],
    sourceProjectId: rosterRecord.projectId || null,
    idempotencyKey: `beam_orchestra:organizationMembership:${options.organizationId}:${participantProfileId}`,
  }

  const cohortMembership = {
    id: createDeterministicId('cohort_membership', [options.cohortId, participantProfileId]),
    cohortId: options.cohortId,
    participantProfileId,
    membershipStatus: mapRosterStatus(rosterRecord.status),
    projectId: rosterRecord.projectId || null,
    cohortRole: rosterRecord.role || 'musician',
    instrument: rosterRecord.instrument || null,
    sourceStatus: rosterRecord.status || null,
    joinedAt: asIsoString(pickFirst(rosterRecord.joinedAt, identity.musicianDoc?.joinedAt, identity.userDoc?.createdAt)),
    notes: rosterRecord.notes || null,
    manualReview: participantProfile.manualReview,
    idempotencyKey: `beam_orchestra:cohortMembership:${options.cohortId}:${participantProfileId}`,
  }

  const participantSourceAttribution = [
    {
      id: createDeterministicId('participant_source', [participantProfileId, 'projectMusicians', rosterRecord.id]),
      participantProfileId,
      sourceSystem: 'beam_orchestra',
      sourceCollection: 'projectMusicians',
      sourceDocumentId: rosterRecord.id,
      sourceDocumentPath: `projectMusicians/${rosterRecord.id}`,
      sourceProjectId: rosterRecord.projectId || null,
      matchedBy: identity.matchMethod,
      isPrimarySource: true,
      idempotencyKey: `beam_orchestra:projectMusicians:${rosterRecord.id}`,
    },
  ]

  if (identity.authUser?.uid) {
    participantSourceAttribution.push({
      id: createDeterministicId('participant_source', [participantProfileId, 'auth', identity.authUser.uid]),
      participantProfileId,
      sourceSystem: 'firebase_auth',
      sourceCollection: 'authUsers',
      sourceDocumentId: identity.authUser.uid,
      sourceDocumentPath: `authUsers/${identity.authUser.uid}`,
      matchedBy: identity.matchMethod,
      isPrimarySource: false,
      idempotencyKey: `firebase_auth:${identity.authUser.uid}`,
    })
  }

  if (identity.userDoc?.id) {
    participantSourceAttribution.push({
      id: createDeterministicId('participant_source', [participantProfileId, 'users', identity.userDoc.id]),
      participantProfileId,
      sourceSystem: 'beam_orchestra',
      sourceCollection: 'users',
      sourceDocumentId: identity.userDoc.id,
      sourceDocumentPath: `users/${identity.userDoc.id}`,
      matchedBy: identity.matchMethod,
      isPrimarySource: false,
      idempotencyKey: `beam_orchestra:users:${identity.userDoc.id}`,
    })
  }

  if (identity.musicianDoc?.id) {
    participantSourceAttribution.push({
      id: createDeterministicId('participant_source', [participantProfileId, 'musicians', identity.musicianDoc.id]),
      participantProfileId,
      sourceSystem: 'beam_orchestra',
      sourceCollection: 'musicians',
      sourceDocumentId: identity.musicianDoc.id,
      sourceDocumentPath: `musicians/${identity.musicianDoc.id}`,
      matchedBy: identity.matchMethod,
      isPrimarySource: false,
      idempotencyKey: `beam_orchestra:musicians:${identity.musicianDoc.id}`,
    })
  }

  identity.prospectDocs.forEach((prospectDoc) => {
    participantSourceAttribution.push({
      id: createDeterministicId('participant_source', [participantProfileId, 'prospects', prospectDoc.id]),
      participantProfileId,
      sourceSystem: 'beam_orchestra',
      sourceCollection: 'prospects',
      sourceDocumentId: prospectDoc.id,
      sourceDocumentPath: `prospects/${prospectDoc.id}`,
      matchedBy: identity.matchMethod,
      isPrimarySource: false,
      idempotencyKey: `beam_orchestra:prospects:${prospectDoc.id}`,
    })
  })

  return {
    participantProfile,
    organizationMembership,
    cohortMembership,
    participantSourceAttribution,
    manualReview: participantProfile.manualReview
      ? createManualReviewEntry(participantProfileId, rosterRecord, manualReviewReasons, identity.candidateMatches)
      : null,
  }
}

function summarizeExcludedRecord(rosterRecord, reason) {
  return {
    id: rosterRecord.id,
    name: rosterRecord.name || null,
    email: rosterRecord.email || null,
    phone: rosterRecord.phone || null,
    instrument: rosterRecord.instrument || null,
    status: rosterRecord.status || null,
    source: rosterRecord.source || null,
    reason,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { auth, db } = initializeAdmin(process.cwd())

  const [authUsers, users, musicians, roster, prospects] = await Promise.all([
    listAuthUsers(auth),
    fetchCollectionDocs(db, 'users'),
    fetchCollectionDocs(db, 'musicians'),
    fetchCollectionDocs(db, 'projectMusicians'),
    fetchCollectionDocs(db, 'prospects'),
  ])

  const filteredRoster = roster
    .filter((record) => record.projectId === options.projectId)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))

  const indexes = {
    authByUid: indexBy(authUsers, (record) => record.uid),
    authByEmail: indexBy(authUsers, (record) => record.email),
    authByPhone: indexBy(authUsers, (record) => record.phone),
    usersByUid: indexBy(users, (record) => record.id),
    usersByEmail: indexBy(users, (record) => normalizeEmail(record.email)),
    usersByPhone: indexBy(users, (record) => normalizePhone(record.phone)),
    usersByName: indexMany(users, (record) => normalizeName(record.name)),
    musiciansByUid: indexBy(musicians, (record) => record.id),
    musiciansByEmail: indexBy(musicians, (record) => normalizeEmail(record.email)),
    musiciansByPhone: indexBy(musicians, (record) => normalizePhone(record.phone)),
    musiciansByName: indexMany(musicians, (record) => normalizeName(record.name)),
    prospectsByEmail: indexMany(
      prospects.filter((record) => !looksLikeTestRecord(record) || options.includeTests),
      (record) => normalizeEmail(record.email),
    ),
    prospectsByPhone: indexMany(
      prospects.filter((record) => !looksLikeTestRecord(record) || options.includeTests),
      (record) => normalizePhone(record.phone),
    ),
  }

  const participantProfiles = []
  const organizationMemberships = []
  const cohortMemberships = []
  const participantSourceAttribution = []
  const manualReview = []
  const excluded = []

  filteredRoster.forEach((rosterRecord) => {
    if (!options.includeTests && looksLikeTestRecord(rosterRecord)) {
      excluded.push(summarizeExcludedRecord(rosterRecord, 'obvious_test_record'))
      return
    }

    if (looksLikePlaceholder(rosterRecord)) {
      excluded.push(summarizeExcludedRecord(rosterRecord, 'placeholder_or_non_person'))
      return
    }

    const identity = resolveIdentity(rosterRecord, indexes)
    identity.rosterRecord = rosterRecord

    if (!options.includeAdminStaff && hasAdminSignals(identity)) {
      excluded.push(summarizeExcludedRecord(rosterRecord, 'admin_or_staff_record'))
      return
    }

    const exportRows = buildExportRows(rosterRecord, identity, options)

    participantProfiles.push(exportRows.participantProfile)
    organizationMemberships.push(exportRows.organizationMembership)
    cohortMemberships.push(exportRows.cohortMembership)
    participantSourceAttribution.push(...exportRows.participantSourceAttribution)
    if (exportRows.manualReview) manualReview.push(exportRows.manualReview)
  })

  const payload = {
    metadata: {
      generatedAt: new Date().toISOString(),
      sourceProjectId: options.projectId,
      sourceCollections: ['projectMusicians', 'authUsers', 'users', 'musicians', 'prospects'],
      organizationId: options.organizationId,
      cohortId: options.cohortId,
      includeAdminStaff: options.includeAdminStaff,
      includeTests: options.includeTests,
      counts: {
        sourceRosterRows: filteredRoster.length,
        exportedParticipantProfiles: participantProfiles.length,
        exportedOrganizationMemberships: organizationMemberships.length,
        exportedCohortMemberships: cohortMemberships.length,
        exportedSourceAttributions: participantSourceAttribution.length,
        manualReviewCount: manualReview.length,
        excludedCount: excluded.length,
      },
    },
    participantProfiles: participantProfiles.sort((a, b) => a.id.localeCompare(b.id)),
    organizationMemberships: organizationMemberships.sort((a, b) => a.id.localeCompare(b.id)),
    cohortMemberships: cohortMemberships.sort((a, b) => a.id.localeCompare(b.id)),
    participantSourceAttribution: participantSourceAttribution.sort((a, b) => a.id.localeCompare(b.id)),
    manualReview: manualReview.sort((a, b) => a.id.localeCompare(b.id)),
    excluded: excluded.sort((a, b) => a.id.localeCompare(b.id)),
  }

  safeJsonWrite(options.outputPath, payload)

  console.log(`Exported ${payload.metadata.counts.exportedParticipantProfiles} participant profiles from ${payload.metadata.counts.sourceRosterRows} BDSO roster rows.`)
  console.log(`Manual review: ${payload.metadata.counts.manualReviewCount}`)
  console.log(`Excluded: ${payload.metadata.counts.excludedCount}`)
  console.log(`Output: ${options.outputPath}`)

  if (options.stdout) {
    console.log(JSON.stringify(payload, null, 2))
  }
}

main().catch((error) => {
  console.error('BDSO participant export failed:', error)
  process.exitCode = 1
})
