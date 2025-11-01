'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Music, 
  Users, 
  Calendar, 
  BookOpen, 
  Theater, 
  Mic,
  MapPin,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Module {
  id: string
  name: string
  description: string
  focus: string[]
  relatedProjects: string[]
  city: string
  active: boolean
  materialsUrl?: string | null
}

const moduleIcons: Record<string, any> = {
  'symphonic-training-lab': Music,
  'opera-lab': Theater,
  'musical-lab': Theater,
  'choir-lab': Mic,
  'chamber-lab': Users,
  'zarzuela-cultural-theatre': Theater,
  'professional-series': Music,
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchModules = async () => {
      try {
        if (db) {
          const snapshot = await getDocs(collection(db, 'modules'))
          const modulesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Module))
          setModules(modulesData.filter(m => m.active).sort((a, b) => a.name.localeCompare(b.name)))
        } else {
          // Fallback mock data
          setModules([
            {
              id: 'symphonic-training-lab',
              name: 'Symphonic Training Lab',
              description: 'Core orchestral training for strings, winds, brass, and percussion.',
              focus: ['instrumental', 'orchestral'],
              relatedProjects: ['black-diaspora-symphony'],
              city: 'Milwaukee',
              active: true
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching modules:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchModules()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pattern">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-orchestra-dark mb-6">
            Training Modules
          </h1>
          <p className="text-lg text-orchestra-cream/80 max-w-3xl mx-auto">
            BEAM Orchestra offers specialized training labs connecting musicians, educators, and community orchestras across multiple disciplines.
          </p>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => {
              const Icon = moduleIcons[module.id] || Music
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 hover:border-orchestra-gold/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orchestra-gold/20 rounded-lg">
                      <Icon className="h-6 w-6 text-orchestra-gold" />
                    </div>
                    <div className="flex items-center text-sm text-orchestra-cream/70">
                      <MapPin className="h-4 w-4 mr-1" />
                      {module.city}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-orchestra-gold mb-2">
                    {module.name}
                  </h3>
                  
                  <p className="text-orchestra-cream/80 text-sm mb-4 line-clamp-3">
                    {module.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {module.focus.slice(0, 3).map((focus) => (
                      <span
                        key={focus}
                        className="px-2 py-1 bg-orchestra-gold/10 text-orchestra-gold text-xs rounded-full"
                      >
                        {focus}
                      </span>
                    ))}
                  </div>

                  {module.materialsUrl && (
                    <Link
                      href={module.materialsUrl}
                      className="flex items-center text-orchestra-gold hover:text-orchestra-gold/80 text-sm font-medium"
                    >
                      <BookOpen className="h-4 w-4 mr-1" />
                      View Materials
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

