/**
 * Seed BDSO institution dashboard records.
 *
 * Dry run:
 *   npx tsx scripts/seedBDSOInstitutions.ts
 *
 * Apply:
 *   npx tsx scripts/seedBDSOInstitutions.ts --apply
 *
 * Optional contact access:
 *   npx tsx scripts/seedBDSOInstitutions.ts --apply --contact-email=name@school.edu
 */
import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const INSTITUTION_ACCOUNTS_COLLECTION = 'institutionAccounts'
const INSTITUTION_PROJECTS_COLLECTION = 'institutionProjects'
const BDSO_PROJECT_ID = 'black-diaspora-symphony'

type SeedAccount = {
  id: string
  name: string
  shortName: string
  status: 'pending' | 'active' | 'paused'
  type: 'school' | 'venue' | 'nonprofit' | 'partner' | 'other'
  city: string
  state: string
  website?: string
  contactEmails: string[]
  emailDomains: string[]
  userIds: string[]
  projectIds: string[]
  contacts: Array<{ name: string; email: string; role: string }>
  dashboardSummary: string
  notes: string
}

type SeedProject = {
  id: string
  institutionId: string
  projectId: string
  title: string
  status: 'planning' | 'active' | 'completed' | 'paused'
  summary: string
  location: string
  performanceDate: string
  rehearsalWindow: string
  rosterTarget: number
  confirmedMusicians: number
  prospectCount: number
  mediaCount: number
  nextActions: string[]
  programHighlights: string[]
  milestones: Array<{ label: string; status: 'pending' | 'in_progress' | 'complete'; dueDate?: string }>
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

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

function getArgValue(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? ''
}

async function main() {
  initAdmin()
  const db = getFirestore()
  const apply = process.argv.includes('--apply')
  const contactEmail = normalizeEmail(getArgValue('contact-email'))

  const sharedContactEmails = contactEmail ? [contactEmail] : []
  const sharedContacts = contactEmail
    ? [{ name: contactEmail, email: contactEmail, role: 'Institution dashboard contact' }]
    : []

  const accounts: SeedAccount[] = [
    {
      id: 'central-united-methodist',
      name: 'Central United Methodist Church',
      shortName: 'Central UMC',
      status: 'pending',
      type: 'venue',
      city: 'Milwaukee',
      state: 'WI',
      contactEmails: sharedContactEmails,
      emailDomains: [],
      userIds: [],
      projectIds: ['central-united-methodist-bdso-memorial'],
      contacts: sharedContacts,
      dashboardSummary:
        'Venue and community partner workspace for BDSO performance logistics, hospitality, audience experience, and institutional follow-up.',
      notes: 'Add confirmed venue contacts before marking active.',
    },
    {
      id: 'evans-illinois-school',
      name: "Evan's Illinois School Performance Partner",
      shortName: 'Illinois School Partner',
      status: 'pending',
      type: 'school',
      city: 'Chicago Area',
      state: 'IL',
      contactEmails: sharedContactEmails,
      emailDomains: [],
      userIds: [],
      projectIds: ['evans-illinois-school-bdso-demo'],
      contacts: sharedContacts,
      dashboardSummary:
        'School partner workspace for the BDSO education performance, AR/VR demo, meal planning, and merchandise coordination.',
      notes: 'Replace placeholder account name with the final school name when confirmed.',
    },
  ]

  const projects: SeedProject[] = [
    {
      id: 'central-united-methodist-bdso-memorial',
      institutionId: 'central-united-methodist',
      projectId: BDSO_PROJECT_ID,
      title: 'BDSO Memorial Concert Institution View',
      status: 'planning',
      summary:
        'Institution-facing operational snapshot for BDSO Memorial Concert planning, venue readiness, roster state, and program context.',
      location: 'Central United Methodist Church',
      performanceDate: '2025-12-14',
      rehearsalWindow: 'Fall 2025 rehearsal cycle',
      rosterTarget: 60,
      confirmedMusicians: 24,
      prospectCount: 2,
      mediaCount: 0,
      nextActions: [
        'Confirm institution contacts for dashboard access.',
        'Attach final venue schedule and hospitality notes.',
        'Review public-facing program copy with BDSO leadership.',
      ],
      programHighlights: ['Margaret Bonds', 'Maurice Ravel', 'Edvard Grieg'],
      milestones: [
        { label: 'Venue contacts confirmed', status: 'pending' },
        { label: 'Roster audit imported', status: 'complete' },
        { label: 'Final day-of logistics posted', status: 'pending' },
      ],
    },
    {
      id: 'evans-illinois-school-bdso-demo',
      institutionId: 'evans-illinois-school',
      projectId: BDSO_PROJECT_ID,
      title: 'Illinois School Performance And AR/VR Demo',
      status: 'planning',
      summary:
        'Planning snapshot for school performance programming with AR/VR demo, student meal coordination, merchandise table, and participant content capture.',
      location: 'Illinois school venue pending',
      performanceDate: '',
      rehearsalWindow: 'Scheduling pending',
      rosterTarget: 12,
      confirmedMusicians: 0,
      prospectCount: 0,
      mediaCount: 0,
      nextActions: [
        'Confirm school name, primary contact, date window, and room capacity.',
        'Define AR/VR demo equipment list and setup time.',
        'Scope meal count, dietary constraints, and merchandise inventory.',
      ],
      programHighlights: ['BDSO education performance', 'AR/VR music demo', 'Meal and merchandise activation'],
      milestones: [
        { label: 'School partner confirmed', status: 'pending' },
        { label: 'Demo technical requirements approved', status: 'pending' },
        { label: 'Hospitality and merch plan approved', status: 'pending' },
      ],
    },
  ]

  console.log(`${apply ? 'APPLY' : 'DRY RUN'} BDSO institution seed`)
  console.log(`  accounts: ${accounts.length}`)
  console.log(`  projects: ${projects.length}`)
  console.log(`  contact email: ${contactEmail || 'none'}`)

  for (const account of accounts) {
    console.log(`\n${apply ? 'UPSERT' : 'WOULD UPSERT'} ${INSTITUTION_ACCOUNTS_COLLECTION}/${account.id}`)
    console.log(`  name: ${account.name}`)
    console.log(`  status: ${account.status}`)
    console.log(`  projectIds: ${account.projectIds.join(', ')}`)

    if (apply) {
      await db.collection(INSTITUTION_ACCOUNTS_COLLECTION).doc(account.id).set(
        {
          ...account,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }
  }

  for (const project of projects) {
    console.log(`\n${apply ? 'UPSERT' : 'WOULD UPSERT'} ${INSTITUTION_PROJECTS_COLLECTION}/${project.id}`)
    console.log(`  title: ${project.title}`)
    console.log(`  institutionId: ${project.institutionId}`)
    console.log(`  status: ${project.status}`)

    if (apply) {
      await db.collection(INSTITUTION_PROJECTS_COLLECTION).doc(project.id).set(
        {
          ...project,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }
  }

  console.log(`\nDone. mode=${apply ? 'apply' : 'dry-run'}`)
}

main().catch((error) => {
  console.error('BDSO institution seed failed:', error)
  process.exit(1)
})
