/**
 * Script to check what's in projectRehearsalMedia collection
 * Run with: npx tsx scripts/check-studio-media.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load service account key from project root
let serviceAccount
try {
  const serviceAccountPath = join(process.cwd(), 'service-account.json')
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountData)
} catch (error) {
  console.error('❌ Failed to load service-account.json')
  console.error('💡 Make sure service-account.json is in the project root directory')
  process.exit(1)
}

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || 'beam-orchestra-platform',
})

const adminDb = getFirestore(app)

async function checkMedia() {
  try {
    console.log('\n🔍 Checking projectRehearsalMedia collection...\n')
    
    const snapshot = await adminDb.collection('projectRehearsalMedia').get()
    
    if (snapshot.empty) {
      console.log('❌ No documents found in projectRehearsalMedia collection')
      console.log('💡 Run: npx tsx scripts/add-studio-media.ts to add videos')
      return
    }
    
    console.log(`✅ Found ${snapshot.size} documents:\n`)
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`${index + 1}. ${doc.id}`)
      console.log(`   Title: ${data.title || 'MISSING'}`)
      console.log(`   Project ID: ${data.projectId || 'MISSING'}`)
      console.log(`   Private: ${data.private}`)
      console.log(`   Has URL: ${!!data.url}`)
      console.log(`   Has Date: ${!!data.date}`)
      console.log(`   Date: ${data.date?.toDate?.() || 'MISSING'}`)
      console.log(`   URL: ${data.url ? data.url.substring(0, 80) + '...' : 'MISSING'}`)
      console.log('')
    })
    
    // Check for issues
    const issues: string[] = []
    snapshot.docs.forEach(doc => {
      const data = doc.data()
      if (!data.title) issues.push(`${doc.id}: Missing title`)
      if (!data.url) issues.push(`${doc.id}: Missing url`)
      if (data.private === undefined) issues.push(`${doc.id}: Missing private field`)
      if (data.private === true) issues.push(`${doc.id}: Marked as private (will be hidden)`)
      if (!data.date) issues.push(`${doc.id}: Missing date`)
      if (!data.projectId) issues.push(`${doc.id}: Missing projectId`)
    })
    
    if (issues.length > 0) {
      console.log('⚠️  Issues found:\n')
      issues.forEach(issue => console.log(`   - ${issue}`))
      console.log('')
    }
    
    const publicCount = snapshot.docs.filter(doc => doc.data().private === false).length
    console.log(`📊 Summary:`)
    console.log(`   Total documents: ${snapshot.size}`)
    console.log(`   Public (private: false): ${publicCount}`)
    console.log(`   Private (private: true): ${snapshot.size - publicCount}`)
    console.log('')
    
  } catch (error: any) {
    console.error('❌ Error checking media:', error.message)
    process.exit(1)
  }
}

checkMedia()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })


