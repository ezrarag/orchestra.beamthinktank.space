/**
 * Script to add rehearsal footage media items to Firestore
 * Run with: npx tsx scripts/add-rehearsal-media.ts
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin with explicit project ID
const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform',
})

const adminDb = getFirestore(app)

const PROJECT_ID = 'black-diaspora-symphony'
const REHEARSAL_DATE = '2025-11-10'
const UPLOADED_BY = 'system' // You can change this to a specific admin email

const mediaItems = [
  {
    title: 'Bonds - 5:08 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=68f26fd3-60ed-465a-841b-71073d683034',
    composer: 'Bonds',
    time: '5:08 PM'
  },
  {
    title: 'Bonds - 5:28 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2028%20pm%20-%2011%2010%2025.mov?alt=media&token=cab69290-25d3-4c9b-9e06-f34ce1e67c9c',
    composer: 'Bonds',
    time: '5:28 PM'
  },
  {
    title: 'Bonds - 5:40 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%205%2040%20pm%20-%2011%2010%2025.mov?alt=media&token=35402118-7f27-4cfd-bb7b-39bf9b150414',
    composer: 'Bonds',
    time: '5:40 PM'
  },
  {
    title: 'Grieg - 5:08 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2008%20pm%20-%2011%2010%2025.mov?alt=media&token=7ae6ce2a-833f-4da4-849d-cc99c9aac768',
    composer: 'Grieg',
    time: '5:08 PM'
  },
  {
    title: 'Bonds - 6:05 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FBonds%20-%206%2005%20pm%20-%2011%2010%2025.mov?alt=media&token=774347b4-5d30-4cf1-8007-cda0243e95a6',
    composer: 'Bonds',
    time: '6:05 PM'
  },
  {
    title: 'Grieg - 5:14 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FGrieg%20-%205%2014%20pm%20-%2011%2010%2025.mov?alt=media&token=17486778-436a-4c68-b5fe-ecf3a1302401',
    composer: 'Grieg',
    time: '5:14 PM'
  },
  {
    title: 'Ravel - 6:49 PM - 11/10/25',
    url: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/Black%20Diaspora%20Symphony%2FMusic%2Frehearsal%20footage%2FRavel%20-%206%2049%20pm%20-%2011%2010%2025.mov?alt=media&token=1a893711-d08c-45bd-8963-1036d162731c',
    composer: 'Ravel',
    time: '6:49 PM'
  }
]

async function addMediaItems() {
  try {
    console.log(`Adding ${mediaItems.length} media items to project: ${PROJECT_ID}`)
    
    for (const item of mediaItems) {
      const mediaData = {
        projectId: PROJECT_ID,
        title: item.title,
        type: 'rehearsal' as const,
        rehearsalId: REHEARSAL_DATE,
        storagePath: null, // Using external URL, not Firebase Storage path
        downloadURL: item.url,
        access: ['musician'] as ('musician' | 'subscriber' | 'public')[], // Accessible to musicians and admin/board
        uploadedBy: UPLOADED_BY,
        uploadedAt: new Date(),
        description: `Rehearsal footage - ${item.composer} at ${item.time} on November 10, 2025`
      }

      await adminDb.collection('projectMedia').add(mediaData)
      console.log(`✓ Added: ${item.title}`)
    }

    console.log(`\n✅ Successfully added ${mediaItems.length} media items!`)
    console.log(`\nAccess URLs:`)
    console.log(`- Admin/Board: /admin/projects/${PROJECT_ID}/media`)
    console.log(`- Musicians: /projects/${PROJECT_ID}/media`)
  } catch (error) {
    console.error('Error adding media items:', error)
    process.exit(1)
  }
}

// Run the script
addMediaItems()
  .then(() => {
    console.log('\nScript completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

