/**
 * Script to fix documents marked as private: true
 * Run with: npx tsx scripts/fix-private-field.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load service account key
let serviceAccount
try {
  const serviceAccountPath = join(process.cwd(), 'service-account.json')
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountData)
} catch (error) {
  console.error('❌ Failed to load service-account.json')
  process.exit(1)
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || 'beam-orchestra-platform',
})

async function fixPrivateField() {
  try {
    const db = getFirestore()
    
    console.log('\n🔍 Finding all documents in projectRehearsalMedia...\n')
    
    // Get all documents
    const snapshot = await db.collection('projectRehearsalMedia').get()
    
    if (snapshot.empty) {
      console.log('❌ No documents found')
      return
    }
    
    console.log(`Found ${snapshot.size} documents\n`)
    
    let updatedCount = 0
    let alreadyPublicCount = 0
    
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const docId = doc.id
      
      console.log(`📄 ${docId}:`)
      console.log(`   Title: ${data.title}`)
      console.log(`   Current private: ${data.private}`)
      
      if (data.private === true) {
        await doc.ref.update({
          private: false,
          updatedAt: new Date()
        })
        console.log(`   ✅ Updated to private: false\n`)
        updatedCount++
      } else if (data.private === false) {
        console.log(`   ✓ Already public\n`)
        alreadyPublicCount++
      } else {
        // Missing private field
        await doc.ref.update({
          private: false,
          updatedAt: new Date()
        })
        console.log(`   ✅ Added private: false (was missing)\n`)
        updatedCount++
      }
    }
    
    console.log(`\n✨ Summary:`)
    console.log(`   ✅ Updated: ${updatedCount}`)
    console.log(`   ✓ Already public: ${alreadyPublicCount}`)
    console.log(`\n🎉 Done! Videos should now appear on /studio`)
    
  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
    process.exit(1)
  }
}

fixPrivateField()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })



