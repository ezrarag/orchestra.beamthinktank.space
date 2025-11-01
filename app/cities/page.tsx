'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Music, Users, CheckCircle, Clock, XCircle } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface City {
  id: string
  name: string
  lat: number
  lon: number
  activeProjects: string[]
  activeModules: string[]
  status: 'active' | 'planned' | 'inactive'
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)

  useEffect(() => {
    const fetchCities = async () => {
      try {
        if (db) {
          const snapshot = await getDocs(collection(db, 'cities'))
          const citiesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as City))
          setCities(citiesData.sort((a, b) => {
            // Active cities first
            if (a.status === 'active' && b.status !== 'active') return -1
            if (b.status === 'active' && a.status !== 'active') return 1
            return a.name.localeCompare(b.name)
          }))
        } else {
          // Fallback mock data
          setCities([
            {
              id: 'milwaukee',
              name: 'Milwaukee',
              lat: 43.0389,
              lon: -87.9065,
              activeProjects: ['black-diaspora-symphony'],
              activeModules: ['symphonic-training-lab'],
              status: 'active'
            }
          ])
        }
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCities()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-pattern">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  const activeCities = cities.filter(c => c.status === 'active')
  const plannedCities = cities.filter(c => c.status === 'planned')

  return (
    <div className="min-h-screen bg-pattern">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-orchestra-dark mb-6">
            Geographic Nodes
          </h1>
          <p className="text-lg text-orchestra-cream/80 max-w-3xl mx-auto">
            BEAM Orchestra connects musicians and educators across multiple cities, each serving as a hub for community orchestral programs.
          </p>
        </div>
      </section>

      {/* Simple Map Visualization (using CSS grid) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city, index) => (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelectedCity(city)}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 hover:border-orchestra-gold/40 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-6 w-6 text-orchestra-gold" />
                    <h3 className="text-xl font-bold text-orchestra-gold">
                      {city.name}
                    </h3>
                  </div>
                  {city.status === 'active' && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {city.status === 'planned' && (
                    <Clock className="h-5 w-5 text-yellow-400" />
                  )}
                  {city.status === 'inactive' && (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center text-sm text-orchestra-cream/70 mb-1">
                      <Music className="h-4 w-4 mr-1" />
                      Active Projects
                    </div>
                    <p className="text-orchestra-cream font-medium">
                      {city.activeProjects.length} project{city.activeProjects.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center text-sm text-orchestra-cream/70 mb-1">
                      <Users className="h-4 w-4 mr-1" />
                      Training Modules
                    </div>
                    <p className="text-orchestra-cream font-medium">
                      {city.activeModules.length} module{city.activeModules.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-orchestra-gold/20">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      city.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : city.status === 'planned'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {city.status === 'active' ? 'Active' : city.status === 'planned' ? 'Coming Soon' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Selected City Details Modal */}
      {selectedCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedCity(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-orchestra-dark rounded-xl border border-orchestra-gold/30 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold text-orchestra-gold mb-4">
              {selectedCity.name}
            </h2>
            <p className="text-orchestra-cream/80 mb-6">
              Coordinates: {selectedCity.lat.toFixed(4)}, {selectedCity.lon.toFixed(4)}
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-orchestra-gold mb-2">Active Projects</h3>
                <ul className="space-y-1">
                  {selectedCity.activeProjects.length > 0 ? (
                    selectedCity.activeProjects.map((projectId) => (
                      <li key={projectId} className="text-orchestra-cream">
                        • {projectId}
                      </li>
                    ))
                  ) : (
                    <li className="text-orchestra-cream/60">No active projects</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orchestra-gold mb-2">Training Modules</h3>
                <ul className="space-y-1">
                  {selectedCity.activeModules.length > 0 ? (
                    selectedCity.activeModules.map((moduleId) => (
                      <li key={moduleId} className="text-orchestra-cream">
                        • {moduleId}
                      </li>
                    ))
                  ) : (
                    <li className="text-orchestra-cream/60">No active modules</li>
                  )}
                </ul>
              </div>
            </div>
            <button
              onClick={() => setSelectedCity(null)}
              className="mt-6 px-4 py-2 bg-orchestra-gold text-orchestra-dark rounded-lg font-medium hover:bg-orchestra-gold/90 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

