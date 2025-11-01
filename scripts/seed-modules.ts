import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ 
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'beam-orchestra-platform'
})

const db = getFirestore()

const modules = [
  {
    id: 'symphonic-training-lab',
    name: 'Symphonic Training Lab',
    description: 'Core orchestral training for strings, winds, brass, and percussion. Prepares players for Black Diaspora Symphony Orchestra and professional orchestras.',
    focus: ['instrumental', 'orchestral', 'strings', 'winds', 'brass', 'percussion'],
    relatedProjects: ['black-diaspora-symphony'],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'opera-lab',
    name: 'Opera Lab',
    description: 'Cross-collaboration between singers, directors, and orchestral players. Repertoire study, scene workshops, and accompaniment practice.',
    focus: ['vocal', 'theatre', 'instrumental', 'opera'],
    relatedProjects: [],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'musical-lab',
    name: 'Musical Lab',
    description: 'Broadway-style pit orchestra and vocal performance practice. Collaboration with theatre students and community productions.',
    focus: ['theatre', 'vocal', 'instrumental', 'broadway'],
    relatedProjects: [],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'choir-lab',
    name: 'Choir Lab',
    description: 'For vocalists and soloists performing with orchestra or a cappella. Includes training in diction, ensemble balance, and repertoire reading.',
    focus: ['vocal', 'choral', 'a-cappella'],
    relatedProjects: [],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'chamber-lab',
    name: 'Chamber Lab',
    description: 'Focus on small ensemble skills (duos, trios, quartets, quintets). Develops chamber leadership and collaborative performance.',
    focus: ['instrumental', 'chamber', 'small-ensemble'],
    relatedProjects: [],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'zarzuela-cultural-theatre',
    name: 'Zarzuela & Cultural Theatre',
    description: 'Dedicated to Spanish and Caribbean music theatre traditions.',
    focus: ['theatre', 'vocal', 'cultural', 'spanish', 'caribbean'],
    relatedProjects: [],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'professional-series',
    name: 'Professional Series',
    description: 'Paid contract orchestras and formal performances under BEAM NGO.',
    focus: ['instrumental', 'professional', 'paid-contracts'],
    relatedProjects: ['black-diaspora-symphony'],
    city: 'Milwaukee',
    active: true,
    materialsUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

async function seedModules() {
  console.log('🌱 Seeding modules...')
  
  for (const module of modules) {
    try {
      await db.collection('modules').doc(module.id).set(module, { merge: true })
      console.log(`✅ Seeded: ${module.name}`)
    } catch (error) {
      console.error(`❌ Error seeding ${module.name}:`, error)
    }
  }
  
  console.log('🎉 Module seeding complete!')
}

seedModules().catch(console.error)

