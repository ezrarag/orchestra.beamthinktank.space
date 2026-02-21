/*
 * Seed viewer library content into Firestore from JSON.
 *
 * Usage:
 *   node scripts/seed-viewer-library.js
 *   node scripts/seed-viewer-library.js --dry-run
 *   node scripts/seed-viewer-library.js --file scripts/data/viewer-library.seed.json
 *   node scripts/seed-viewer-library.js --file scripts/data/viewer-area-roles.seed.json
 *   node scripts/seed-viewer-library.js --file scripts/data/publishing.seed.json --cleanup-deprecated
 */

const fs = require('fs')
const path = require('path')
const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

function getArg(flag, fallback) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback
  return process.argv[idx + 1]
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

async function cleanupDeprecatedArea(db, areaId) {
  await db.collection('viewerAreas').doc(areaId).delete()

  const sectionSnapshot = await db.collection('viewerSections').where('areaId', '==', areaId).get()
  const contentSnapshot = await db.collection('viewerContent').where('areaId', '==', areaId).get()

  const deletions = []
  sectionSnapshot.forEach((docSnap) => {
    deletions.push(docSnap.ref.delete())
  })
  contentSnapshot.forEach((docSnap) => {
    deletions.push(docSnap.ref.delete())
  })

  if (deletions.length > 0) {
    await Promise.all(deletions)
  }
}

function initAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const root = process.cwd()
  const localServiceAccountPath = path.join(root, 'service-account.json')

  if (fs.existsSync(localServiceAccountPath)) {
    const raw = fs.readFileSync(localServiceAccountPath, 'utf8')
    const serviceAccount = JSON.parse(raw)
    return initializeApp({ credential: cert(serviceAccount) })
  }

  return initializeApp({ credential: applicationDefault() })
}

function validateSeed(seed) {
  if (!seed || typeof seed !== 'object') {
    throw new Error('Seed file must be a JSON object.')
  }
  const hasAreas = Array.isArray(seed.areas)
  const hasSections = Array.isArray(seed.sections)
  const hasContent = Array.isArray(seed.content)
  const hasAreaRoles = Array.isArray(seed.areaRoles)

  if (!hasAreas && !hasSections && !hasContent && !hasAreaRoles) {
    throw new Error('Seed file must include at least one of: "areas", "sections", "content", or "areaRoles".')
  }

  const areas = hasAreas ? seed.areas : []
  const sections = hasSections ? seed.sections : []
  const content = hasContent ? seed.content : []
  const areaRoles = hasAreaRoles ? seed.areaRoles : []

  for (const area of areas) {
    if (!area.id || !area.title) {
      throw new Error(`Invalid area. Each area needs at least id/title. Received: ${JSON.stringify(area)}`)
    }
  }

  const areaIds = new Set(areas.map((a) => a.id))
  const sectionIds = new Set(sections.map((s) => s.id))
  for (const section of sections) {
    if (!section.id || !section.areaId || !section.title) {
      throw new Error(`Invalid section. Each section needs at least id/areaId/title. Received: ${JSON.stringify(section)}`)
    }
    if (areaIds.size > 0 && !areaIds.has(section.areaId)) {
      throw new Error(`Section ${section.id} references unknown areaId: ${section.areaId}`)
    }
  }

  for (const contentRow of content) {
    if (!contentRow.id || !contentRow.areaId || !contentRow.sectionId || !contentRow.title || !contentRow.videoUrl) {
      throw new Error(
        `Invalid content. Each content row needs at least id/areaId/sectionId/title/videoUrl. Received: ${JSON.stringify(contentRow)}`
      )
    }
    if (areaIds.size > 0 && !areaIds.has(contentRow.areaId)) {
      throw new Error(`Content ${contentRow.id} references unknown areaId: ${contentRow.areaId}`)
    }
    if (sectionIds.size > 0 && !sectionIds.has(contentRow.sectionId)) {
      throw new Error(`Content ${contentRow.id} references unknown sectionId: ${contentRow.sectionId}`)
    }
  }

  for (const areaRole of areaRoles) {
    if (!areaRole.areaId || !Array.isArray(areaRole.roles)) {
      throw new Error(`Invalid areaRoles row. Each row needs areaId and roles[]. Received: ${JSON.stringify(areaRole)}`)
    }
    for (const role of areaRole.roles) {
      if (!role.title) {
        throw new Error(`Invalid role in area ${areaRole.areaId}. Each role needs title. Received: ${JSON.stringify(role)}`)
      }
    }
  }
}

async function run() {
  const dryRun = hasFlag('--dry-run')
  const cleanupDeprecated = hasFlag('--cleanup-deprecated')
  const seedFile = getArg('--file', 'scripts/data/viewer-library.seed.json')
  const absoluteSeedFile = path.resolve(process.cwd(), seedFile)

  if (!fs.existsSync(absoluteSeedFile)) {
    throw new Error(`Seed file not found: ${absoluteSeedFile}`)
  }

  const seed = JSON.parse(fs.readFileSync(absoluteSeedFile, 'utf8'))
  validateSeed(seed)
  const areas = Array.isArray(seed.areas) ? seed.areas : []
  const sections = Array.isArray(seed.sections) ? seed.sections : []
  const content = Array.isArray(seed.content) ? seed.content : []
  const areaRoles = Array.isArray(seed.areaRoles) ? seed.areaRoles : []

  console.log(`Loaded seed file: ${absoluteSeedFile}`)
  console.log(
    `Areas: ${areas.length}, Sections: ${sections.length}, Content: ${content.length}, AreaRoles: ${areaRoles.length}`
  )

  if (dryRun) {
    console.log('\nDry run enabled. No writes performed.')
    if (areas.length > 0) {
      console.log('Area IDs:', areas.map((a) => a.id).join(', '))
    }
    if (areaRoles.length > 0) {
      console.log('AreaRole IDs:', areaRoles.map((row) => row.areaId).join(', '))
    }
    if (cleanupDeprecated) {
      console.log('Deprecated cleanup enabled.')
    }
    return
  }

  initAdminApp()
  const db = getFirestore()

  let batch = db.batch()
  let ops = 0
  let batchCount = 0

  const commitBatch = async () => {
    if (ops === 0) return
    await batch.commit()
    batchCount += 1
    console.log(`Committed batch ${batchCount} with ${ops} operations.`)
    batch = db.batch()
    ops = 0
  }

  const queueSet = async (ref, payload) => {
    batch.set(ref, payload, { merge: true })
    ops += 1
    if (ops >= 450) {
      await commitBatch()
    }
  }

  for (const area of areas) {
    const { id, ...rest } = area
    const ref = db.collection('viewerAreas').doc(id)
    const payload = {
      ...rest,
      active: area.active ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }
    await queueSet(ref, payload)
  }

  for (const section of sections) {
    const { id, ...rest } = section
    const ref = db.collection('viewerSections').doc(id)
    const payload = {
      ...rest,
      active: section.active ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }
    await queueSet(ref, payload)
  }

  for (const contentRow of content) {
    const { id, ...rest } = contentRow
    const ref = db.collection('viewerContent').doc(id)
    const payload = {
      ...rest,
      isPublished: contentRow.isPublished ?? true,
      sortOrder: contentRow.sortOrder ?? 999,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }
    await queueSet(ref, payload)
  }

  for (const areaRole of areaRoles) {
    const ref = db.collection('viewerAreaRoles').doc(areaRole.areaId)
    const payload = {
      areaId: areaRole.areaId,
      roles: areaRole.roles.map((role, index) => ({
        id: role.id || `role-${index + 1}`,
        title: role.title,
        description: role.description || '',
        order: Number.isFinite(role.order) ? role.order : index + 1,
      })),
      explainerVideoUrl: areaRole.explainerVideoUrl || '',
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }
    await queueSet(ref, payload)
  }

  await commitBatch()

  if (cleanupDeprecated) {
    const seededAreaIds = new Set(areas.map((area) => area.id))
    if (!seededAreaIds.has('arrangements')) {
      await cleanupDeprecatedArea(db, 'arrangements')
      console.log('Cleaned deprecated area: arrangements')
    }
  }

  console.log('\nViewer library seed complete.')
  console.log('Collections updated: viewerAreas, viewerSections, viewerContent, viewerAreaRoles')
}

run().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
