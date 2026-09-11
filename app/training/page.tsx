'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Users, Music, Calendar, Award, MapPin, Clock, Filter, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { fetchOrchestras, type OrchestraEnsemble } from '@/lib/api/orchestras'

const contractProjects = [
  {
    title: 'Black Diaspora Symphony Orchestra',
    description: "Collaboration celebrating the Black musical tradition through Margaret Bonds' Montgomery Variations and other works.",
    status: 'Active',
    href: '/training/contract-projects/black-diaspora-symphony',
    color: 'from-purple-500 to-blue-500',
  },
  {
    title: 'Concord Symphony / Chamber Orchestra',
    description: 'Core player group contract project directed by Jamin Hoffman for specialized symphonic and chamber masterworks.',
    status: 'Active',
    href: '/training/contract-projects/concord-symphony',
    color: 'from-blue-500 to-teal-500',
  },
  {
    title: 'Milwaukee Film Orchestra',
    description: 'Live orchestral accompaniment for independent film screenings and special events.',
    status: 'Upcoming',
    href: '#',
    color: 'from-amber-500 to-red-500',
  },
]

export default function TrainingPage() {
  const [trainingEnsembles, setTrainingEnsembles] = useState<OrchestraEnsemble[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrainingData() {
      setLoading(true)
      const ensembles = await fetchOrchestras('training')
      setTrainingEnsembles(ensembles)
      setLoading(false)
    }
    loadTrainingData()
  }, [])

  const availableCities = Array.from(
    new Set(['All', ...trainingEnsembles.map((e) => e.city)])
  )

  const filteredEnsembles =
    selectedCity === 'All'
      ? trainingEnsembles
      : trainingEnsembles.filter((e) => e.city.toLowerCase() === selectedCity.toLowerCase())

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
              BEAM Training Orchestra Pipeline
            </h1>
            <p className="text-xl md:text-2xl text-purple-200 mb-8 max-w-3xl mx-auto">
              Per-city weekly rehearsal hubs, musician development, and promotion pipeline to tenured professional ensembles.
            </p>
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white border border-white/10">
              <Users className="w-5 h-5 mr-2 text-[#D4AF37]" />
              <span className="font-semibold">Weekly Rehearsal Hubs & Promotion Review</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-16">
        {/* Weekly Training Ensembles Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-serif font-bold text-white mb-2">
                Weekly City Ensembles
              </h2>
              <p className="text-gray-300 text-sm md:text-base max-w-xl">
                Standing BEAM training orchestras running weekly year-round rehearsals.
              </p>
            </div>

            {/* City Filter */}
            {availableCities.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#D4AF37]" />
                <div className="flex flex-wrap gap-2">
                  {availableCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedCity === city
                          ? 'bg-[#D4AF37] text-black'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
            </div>
          ) : filteredEnsembles.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <p className="text-gray-300 text-lg mb-2">
                No active training orchestra rosters listed for {selectedCity === 'All' ? 'any city' : selectedCity} yet.
              </p>
              <p className="text-gray-400 text-sm">
                Propose a new city training ensemble or apply via the project selection page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnsembles.map((ensemble) => (
                <div
                  key={ensemble.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-400/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-full font-medium">
                        {ensemble.city}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ensemble.rehearsalSchedule.cadence}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{ensemble.name}</h3>

                    <div className="space-y-2 text-sm text-gray-300 mb-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#D4AF37]" />
                        <span>
                          {ensemble.rehearsalSchedule.dayOfWeek}s at {ensemble.rehearsalSchedule.time}
                        </span>
                      </div>
                      {ensemble.venueRef && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#D4AF37]" />
                          <span className="line-clamp-1">{ensemble.venueRef}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D4AF37]" />
                        <span>Roster Size: {ensemble.roster.length} musicians</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-2">
                    <h4 className="text-xs font-semibold uppercase text-purple-300 mb-2">
                      Roster Status Breakdown
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md">
                        {ensemble.roster.filter((r) => r.membershipStatus === 'training').length} Training
                      </span>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-md">
                        {ensemble.roster.filter((r) => r.membershipStatus === 'promotion_review').length} Review
                      </span>
                      <span className="text-xs bg-green-500/20 text-green-300 px-2.5 py-1 rounded-md">
                        {ensemble.roster.filter((r) => r.membershipStatus === 'professional_tenured').length} Tenured
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contract Projects Sub-Section */}
        <section className="pt-8 border-t border-white/10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-white mb-3">
              Contract & Cohort Projects
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto text-sm md:text-base">
              Specialized symphonic contract projects and institutional collaborations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contractProjects.map((project) => (
              <div
                key={project.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-400/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${
                      project.status === 'Active'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {project.status}
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2">{project.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6">{project.description}</p>
                </div>

                <Link
                  href={project.href}
                  className="inline-flex items-center text-purple-300 hover:text-purple-200 font-medium text-sm gap-2"
                >
                  <span>Explore Project</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-sm rounded-2xl p-10 border border-white/10">
            <h2 className="text-3xl font-serif font-bold text-white mb-4">
              Join a BEAM Training Ensemble
            </h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto text-sm sm:text-base">
              Emerging and seasoned musicians can register interest for weekly rehearsals or submit recording project applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/musician/select-project"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Music className="w-5 h-5" />
                Select / Start Project
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
