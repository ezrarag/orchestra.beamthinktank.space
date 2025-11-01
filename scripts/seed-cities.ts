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
    id: 'atlanta',
    name: 'Atlanta',
    lat: 33.7490,
    lon: -84.3880,
    activeProjects: [],
    activeModules: [],
    status: 'planned',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'orlando',
    name: 'Orlando',
    lat: 28.5383,
    lon: -81.3792,
    activeProjects: [],
    activeModules: [],
    status: 'planned',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function seedCities() {
  console.log('🌍 Seeding cities...')
  
  for (const city of cities) {
    try {
      await db.collection('cities').doc(city.id).set(city, { merge: true })
      console.log(`✅ Seeded: ${city.name} (${city.status})`)
    } catch (error) {
      console.error(`❌ Error seeding ${city.name}:`, error)
    }
  }
  
  console.log('🎉 City seeding complete!')
}

seedCities().catch(console.error)

