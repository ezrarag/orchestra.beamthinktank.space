import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ 
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform'
})

const db = getFirestore()

const cities = [
  {
    id: 'milwaukee',
    name: 'Milwaukee',
    lat: 43.0389,
    lon: -87.9065,
    activeProjects: ['black-diaspora-symphony'],
    activeModules: [
      'symphonic-training-lab',
      'opera-lab',
      'musical-lab',
      'choir-lab',
      'chamber-lab',
      'zarzuela-cultural-theatre',
      'professional-series'
    ],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'concord',
    name: 'Concord',
    lat: 43.2081,
    lon: -71.5376,
    activeProjects: ['concord-symphony'],
    activeModules: ['chamber-masterworks-lab'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'orlando',
    name: 'Orlando',
    lat: 28.5383,
    lon: -81.3792,
    activeProjects: ['steinway-gallery-series'],
    activeModules: ['florida-recording-sessions-okorie-tramaine-donte'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'miami',
    name: 'Miami',
    lat: 25.7617,
    lon: -80.1918,
    activeProjects: ['florida-dance-collaboration'],
    activeModules: ['coastal-chamber-lab'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'tampa',
    name: 'Tampa',
    lat: 27.9506,
    lon: -82.4572,
    activeProjects: ['gulf-symphonic-sessions'],
    activeModules: ['community-outreach-lab'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function seedCities() {
  console.log('🌍 Seeding active geographic nodes (Milwaukee, Concord, Orlando, Miami, Tampa)...')
  
  for (const city of cities) {
    try {
      await db.collection('cities').doc(city.id).set(city, { merge: true })
      console.log(`✅ Seeded node: ${city.name} (${city.status})`)
    } catch (error) {
      console.error(`❌ Error seeding ${city.name}:`, error)
    }
  }
  
  console.log('🎉 City node seeding complete!')
}

seedCities().catch(console.error)
