import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { rosterData } from '../app/training/contract-projects/black-diaspora-symphony/data'
import type { Profile, ProfileType, MusicianRole } from '../lib/types/profile'

const PROFILES_COLLECTION = 'profiles'

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]

  const serviceAccountPath = path.join(process.cwd(), 'service-account.json')
  if (fs.existsSync(serviceAccountPath)) {
    const raw = fs.readFileSync(serviceAccountPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      project_id?: string
      private_key?: string
      client_email?: string
    }

    if (parsed.project_id && parsed.private_key && parsed.client_email) {
      return initializeApp({
        credential: cert({
          projectId: parsed.project_id,
          privateKey: parsed.private_key,
          clientEmail: parsed.client_email,
        }),
        projectId: parsed.project_id,
      })
    }
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
  })
}

function cleanString(val: any): string {
  return typeof val === 'string' ? val.trim() : ''
}

async function main() {
  initAdmin()
  const db = getFirestore()
  const apply = process.argv.includes('--apply')

  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} profiles and organizations seed`)

  const profilesToSeed: Profile[] = []

  // 1. Seed Organizations
  const blackDiasporaOrg: Profile = {
    id: 'org_black_diaspora_symphony',
    name: 'Black Diaspora Symphony Orchestra',
    location: 'Milwaukee, WI',
    contact: 'hello@beamcenter.org',
    email: 'hello@beamcenter.org',
    types: ['organization'],
    city: 'Milwaukee',
    budget: 100000,
    rosterSize: 45,
  }

  const concordOrg: Profile = {
    id: 'org_concord_symphony',
    name: 'Concord Symphony/Chamber Orchestra',
    location: 'Concord',
    contact: 'contact@concordsymphony.org',
    email: 'contact@concordsymphony.org',
    types: ['organization'],
    city: 'Concord',
    budget: 150000,
    rosterSize: 60,
  }

  profilesToSeed.push(blackDiasporaOrg, concordOrg)

  // 2. Map & Migrate BDSO Roster into Musician Profiles
  const seenNames = new Set<string>()

  for (const section of rosterData) {
    const sectionInstrument = section.instrument
    
    // Process all musicians in musicianDetails list
    for (const detail of section.musicianDetails || []) {
      const name = cleanString(detail.name)
      if (!name || name.toLowerCase().includes('tbd') || name.toLowerCase().includes('placeholder')) {
        continue
      }

      if (seenNames.has(name)) continue
      seenNames.add(name)

      // Determine deterministic ID
      const namePart = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const profileId = `profile_${namePart}`

      // Determine instrument & section
      const finalInstrument = cleanString((detail as any).instrument || sectionInstrument)
      
      const email = detail.email ? cleanString(detail.email) : undefined
      const phone = (detail as any).phone ? cleanString((detail as any).phone) : undefined

      // Map roles
      const isConductor = finalInstrument.toLowerCase().includes('conductor')
      const musicianRoles: MusicianRole[] = isConductor ? ['conductor'] : ['instrumentalist']

      const profile: Profile = {
        id: profileId,
        name,
        email,
        contact: email || phone || 'N/A',
        location: name === 'Autumn Maria Reed' ? 'Madison, WI' : 'Milwaukee, WI', // Autodetected or defaulted
        types: ['musician'],
        instrument: finalInstrument,
        section: sectionInstrument,
        musicianRoles,
      }

      if (detail.headshotUrl) {
        profile.photoUrl = cleanString(detail.headshotUrl)
      }

      profilesToSeed.push(profile)
    }

    // Process any additional names in section.musicians list that didn't have details
    for (const name of section.musicians || []) {
      const cleanedName = cleanString(name)
      if (!cleanedName || seenNames.has(cleanedName)) continue
      seenNames.add(cleanedName)

      const namePart = cleanedName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      const profileId = `profile_${namePart}`

      const profile: Profile = {
        id: profileId,
        name: cleanedName,
        contact: 'N/A',
        location: 'Milwaukee, WI',
        types: ['musician'],
        instrument: sectionInstrument,
        section: sectionInstrument,
        musicianRoles: ['instrumentalist'],
      }

      profilesToSeed.push(profile)
    }
  }

  // 3. Write to Firestore
  let count = 0
  for (const profile of profilesToSeed) {
    console.log(`\n${apply ? 'UPSERT' : 'WOULD UPSERT'} ${PROFILES_COLLECTION}/${profile.id}`)
    console.log(`  Name: ${profile.name}`)
    console.log(`  Types: ${profile.types.join(', ')}`)
    if (profile.instrument) console.log(`  Instrument: ${profile.instrument}`)
    if (profile.city) console.log(`  City: ${profile.city}`)

    if (apply) {
      const { id, ...data } = profile
      await db.collection(PROFILES_COLLECTION).doc(id).set(
        {
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      count++
    }
  }

  console.log(`\nDone. Mode=${apply ? 'apply' : 'dry-run'}. Total profiles: ${profilesToSeed.length}, Upserted: ${apply ? count : 0}`)
}

main().catch((error) => {
  console.error('Profile seed failed:', error)
  process.exit(1)
})
