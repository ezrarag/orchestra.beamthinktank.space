import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { rosterData } from '../app/training/contract-projects/black-diaspora-symphony/data'

// Initialize Firebase Admin
initializeApp({ 
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform'
})

const db = getFirestore()

async function migrateRoster() {
  console.log('🚀 Starting roster migration...')
  
  let totalMigrated = 0
  let totalSkipped = 0

  for (const section of rosterData) {
    const instrument = section.instrument
    
    for (const musician of section.musicianDetails || []) {
      if (!musician.name) {
        console.warn('⚠️ Skipping musician with no name')
        totalSkipped++
        continue
      }

      // Generate unique ID from email or name
      const emailPart = musician.email 
        ? musician.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : musician.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      
      const docId = `${emailPart}_black-diaspora-symphony`
      
      // Map status to Firestore format
      let status = 'pending'
      if (musician.status === 'Confirmed') {
        status = 'confirmed'
      } else if (musician.status === 'Interested') {
        status = 'pending'
      } else if (musician.status === 'Pending') {
        status = 'pending'
      } else if (musician.status === 'Open') {
        status = 'open'
      }

      const musicianData = {
        projectId: 'black-diaspora-symphony',
        instrument: instrument,
        name: musician.name,
        email: musician.email || null,
        phone: musician.phone || null,
        status: status,
        role: 'musician',
        notes: musician.notes || null,
        bio: musician.bio || null,
        headshotUrl: musician.headshotUrl || null,
        mediaEmbedUrl: musician.mediaEmbedUrl || null,
        supportLink: musician.supportLink || null,
        source: musician.source || 'Migration Script',
        joinedAt: new Date(),
        updatedAt: new Date()
      }

      try {
        await db.collection('projectMusicians').doc(docId).set(musicianData, { merge: true })
        console.log(`✅ Migrated: ${musician.name} (${instrument})`)
        totalMigrated++
      } catch (error) {
        console.error(`❌ Error migrating ${musician.name}:`, error)
        totalSkipped++
      }
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`✅ Successfully migrated: ${totalMigrated} musicians`)
  console.log(`⚠️ Skipped/Errors: ${totalSkipped} musicians`)
  console.log('🎉 Roster migration complete!')
}

migrateRoster().catch(console.error)

