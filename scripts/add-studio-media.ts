/**
 * Script to add rehearsal footage to projectRehearsalMedia collection for /studio page
 * Run with: npx tsx scripts/add-studio-media.ts
 * 
 * This script creates Firestore documents that the /studio page reads from.
 * Each video in Firebase Storage needs a corresponding Firestore document.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load service account key from project root
let serviceAccount
try {
  const serviceAccountPath = join(process.cwd(), 'service-account.json')
  const serviceAccountData = readFileSync(serviceAccountPath, 'utf8')
  serviceAccount = JSON.parse(serviceAccountData)
  console.log('✅ Loaded service account from:', serviceAccountPath)
} catch (error) {
  console.error('❌ Failed to load service-account.json')
  console.error('💡 Make sure service-account.json is in the project root directory')
  process.exit(1)
}

// Initialize Firebase Admin with service account
const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id || 'beam-orchestra-platform',
})

const adminDb = getFirestore(app)

const PROJECT_ID = 'black-diaspora-symphony'

// Media items with their Storage URLs
// Add your video URLs here - you can get these from Firebase Storage console
// Right-click on a file → "Get download URL"
const mediaItems = [
  {
    title: 'Bonds – 5:08 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=68f26fd3-60ed-465a-841b-71073d683034',
    date: '2025-11-10', // YYYY-MM-DD format
    time: '17:08', // 24-hour format for sorting
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Bonds – 5:28 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2028%20pm%20-%2011%2010%2025.mov?alt=media&token=cab69290-25d3-4c9b-9e06-f34ce1e67c9c',
    date: '2025-11-10',
    time: '17:28',
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Bonds – 5:40 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2040%20pm%20-%2011%2010%2025.mov?alt=media&token=35402118-7f27-4cfd-bb7b-39bf9b150414',
    date: '2025-11-10',
    time: '17:40',
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Bonds – 6:05 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%206%2005%20pm%20-%2011%2010%2025.mov?alt=media&token=6e39e63d-e774-4a84-8737-25f1b7d47722',
    date: '2025-11-10',
    time: '18:05',
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Grieg – 5:08 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=17486778-436a-4c68-b5fe-ecf3a1302401',
    date: '2025-11-10',
    time: '17:08',
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Grieg – 5:14 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2014%20pm%20-%2011%2010%2025.mov?alt=media&token=17486778-436a-4c68-b5fe-ecf3a1302401',
    date: '2025-11-10',
    time: '17:14',
    instrumentGroup: 'Full Orchestra' as const,
  },
  {
    title: 'Ravel – 5:31 PM – 11/16/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FRavel%20-%205%2031%20pm%20-%2011%2016%2025.mov?alt=media&token=6e39e63d-e774-4a84-8737-25f1b7d47722',
    date: '2025-11-16',
    time: '17:31',
    instrumentGroup: 'Full Orchestra' as const,
  },
  // Note: Add more videos here by copying their download URLs from Firebase Storage
  // Right-click on file → "Get download URL" → Paste here
  {
    title: 'Ravel – 6:49 PM – 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FRavel%20-%206%2049%20pm%20-%2011%2010%2025.mov?alt=media&token=1a893711-d08c-45bd-8963-1036d162731c',
    date: '2025-11-10',
    time: '18:49',
    instrumentGroup: 'Full Orchestra' as const,
  },
]

async function addStudioMediaItems() {
  try {
    console.log(`\n🎬 Adding ${mediaItems.length} media items to projectRehearsalMedia collection...`)
    console.log(`Project: ${PROJECT_ID}\n`)
    
    let addedCount = 0
    let skippedCount = 0

    for (const item of mediaItems) {
      try {
        // Check if item already exists (by title and projectId)
        const existingQuery = await adminDb
          .collection('projectRehearsalMedia')
          .where('projectId', '==', PROJECT_ID)
          .where('title', '==', item.title)
          .limit(1)
          .get()

        if (!existingQuery.empty) {
          console.log(`⏭️  Skipping existing: ${item.title}`)
          skippedCount++
          continue
        }

        // Parse date string to create Timestamp
        const [year, month, day] = item.date.split('-').map(Number)
        const [hour, minute] = item.time.split(':').map(Number)
        const date = new Date(year, month - 1, day, hour, minute)
        const timestamp = Timestamp.fromDate(date)

        const mediaData = {
          projectId: PROJECT_ID,
          title: item.title,
          description: `Rehearsal footage from ${item.date}`,
          date: timestamp,
          instrumentGroup: item.instrumentGroup,
          url: item.url,
          thumbnailUrl: null, // Optional - add if you have thumbnails
          private: false, // Set to true for subscription-only content
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }

        await adminDb.collection('projectRehearsalMedia').add(mediaData)
        console.log(`✅ Added: ${item.title}`)
        addedCount++
      } catch (error: any) {
        console.error(`❌ Error adding ${item.title}:`, error.message)
      }
    }

    console.log(`\n✨ Summary:`)
    console.log(`   ✅ Added: ${addedCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`\n🎉 Done! Check /studio page to see your videos.`)
  } catch (error: any) {
    console.error('❌ Error adding media items:', error)
    process.exit(1)
  }
}

// Run the script
addStudioMediaItems()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

