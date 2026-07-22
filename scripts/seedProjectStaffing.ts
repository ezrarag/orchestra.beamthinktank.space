/** Dry run: npx tsx scripts/seedProjectStaffing.ts; apply: add --apply. */
import fs from 'fs'
import path from 'path'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

const apply = process.argv.includes('--apply')
const serviceAccountPath = path.join(process.cwd(), 'service-account.json')
if (!getApps().length) {
  const credential = fs.existsSync(serviceAccountPath)
    ? cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
    : applicationDefault()
  initializeApp({ credential, projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform' })
}
const db = getFirestore()

const businessAdditions = [
  ['venue-logistics', 'Venue Logistics', 'Coordinates venue access, load-in, and event operations.'],
  ['transportation-logistics', 'Transportation & Logistics', 'Coordinates travel, freight, and local transportation.'],
  ['ip-contracts-legal', 'IP & Contracts/Legal', 'Handles institutional agreements, IP, and legal coordination.'],
  ['insurance-coordinator', 'Insurance Coordinator', 'Coordinates coverage, certificates, and risk requirements.'],
  ['grant-writer-manager', 'Grant Writer/Manager', 'Develops grant proposals and manages award compliance.'],
]

async function main() {
  const businessRef = db.collection('viewerAreaRoles').doc('business')
  const businessSnap = await businessRef.get()
  const existing = Array.isArray(businessSnap.data()?.roles) ? businessSnap.data()!.roles : []
  const roles = [...existing]
  businessAdditions.forEach(([id, title, description]) => { if (!roles.some((role: { id?: string }) => role.id === id)) roles.push({ id, title, description, order: roles.length + 1 }) })
  const roleSlots = [
    ['ensemble-lead', 'Ensemble Lead', 'chamber'], ['recording-engineer', 'Recording Engineer', 'chamber'],
    ['rights-licensing', 'Rights & Licensing', 'publishing'], ['venue-logistics', 'Venue Logistics', 'business'],
    ['ip-contracts-legal', 'IP & Contracts/Legal', 'business'],
  ].map(([roleId, roleLabel, areaSource], index) => ({ id: `bdso-${roleId}`, roleId, roleLabel, areaSource, slotsNeeded: 1, fillType: index < 2 ? 'subscription_covered' : 'sponsor_participant', filledBy: [] }))
  console.log(JSON.stringify({ businessRoles: roles, project: 'black-diaspora-symphony', roleSlots }, null, 2))
  if (!apply) return console.log('\nDry run only. Re-run with --apply to merge these records.')
  await businessRef.set({ areaId: 'business', roles, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  await db.collection('projects').doc('black-diaspora-symphony').set({ projectType: 'resident_orchestra', roleSlots, subscriptionTier: { tierName: 'BDSO placement', monthlyOrAnnualPrice: 0, includedSeats: { 'ensemble-lead': 1, 'recording-engineer': 1 }, includedHours: {}, subscriberOrgId: '', status: 'draft' }, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  console.log('Applied project staffing seed.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
