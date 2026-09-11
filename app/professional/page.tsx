'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Music,
  Users,
  Calendar,
  MapPin,
  Award,
  Star,
  ArrowRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { fetchOrchestras, type OrchestraEnsemble, type OrchestraRosterMember } from '@/lib/api/orchestras'

export default function ProfessionalPage() {
  const [professionalOrchestras, setProfessionalOrchestras] = useState<OrchestraEnsemble[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProOrchestras() {
      setLoading(true)
      const data = await fetchOrchestras('professional')
      setProfessionalOrchestras(data)
      setLoading(false)
    }
    loadProOrchestras()
  }, [])

  // Aggregate roster members across professional ensembles
  const tenuredMusicians: OrchestraRosterMember[] = professionalOrchestras.flatMap((o) =>
    o.roster.filter((r) => r.membershipStatus === 'professional_tenured')
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
              BEAM Professional Orchestra
            </h1>
            <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
              Tenured professional ensembles delivering concert performances, recording sessions, and artistic masterworks.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white border border-white/10">
                <Users className="w-5 h-5 mr-2 text-[#D4AF37]" />
                <span className="font-semibold">{tenuredMusicians.length} Tenured Musicians</span>
              </div>
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 text-white border border-white/10">
                <Award className="w-5 h-5 mr-2 text-[#D4AF37]" />
                <span className="font-semibold">Professional Masterwork Series</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-16">
        {/* Professional Ensembles Section */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-white mb-3">
              Professional Ensembles
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto text-sm md:text-base">
              BEAM tenured professional player groups and regional symphonic ensembles.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]" />
            </div>
          ) : professionalOrchestras.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
              <p className="text-gray-300 text-lg mb-2">No professional orchestra ensembles initialized in Firestore yet.</p>
              <p className="text-gray-400 text-sm mb-6">
                Tenured positions are awarded through the BEAM Training Orchestra promotion review pipeline.
              </p>
              <Link
                href="/training"
                className="bg-[#D4AF37] text-black font-semibold px-5 py-2.5 rounded-xl text-sm inline-block"
              >
                View Training Pipeline
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionalOrchestras.map((ensemble) => (
                <div
                  key={ensemble.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-blue-400/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-3 py-1 rounded-full font-medium mb-3 inline-block">
                      {ensemble.city}
                    </span>
                    <h3 className="text-xl font-bold text-white mb-2">{ensemble.name}</h3>

                    <div className="space-y-2 text-sm text-gray-300 mb-6">
                      {ensemble.venueRef && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#D4AF37]" />
                          <span className="line-clamp-1">{ensemble.venueRef}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D4AF37]" />
                        <span>
                          Tenured Musician Roster: {ensemble.roster.filter((r) => r.membershipStatus === 'professional_tenured').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tenured Roster Section */}
        <section className="pt-8 border-t border-white/10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-white mb-3">
              Tenured Musician Roster
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto text-sm md:text-base">
              Musicians promoted from the training orchestra pipeline into tenured professional status.
            </p>
          </div>

          {tenuredMusicians.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm">
                No musicians have completed promotion review to tenured professional status yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tenuredMusicians.map((member, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-[#D4AF37]/50 transition-all"
                >
                  <div className="w-16 h-16 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Music className="w-8 h-8 text-[#D4AF37]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {member.participantName || member.participantRef}
                  </h3>
                  <p className="text-purple-300 text-sm mb-2">{member.instrument || 'Orchestral Artist'}</p>
                  <span className="inline-block bg-green-500/20 text-green-300 text-xs px-3 py-1 rounded-full font-medium">
                    Tenured Professional
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Performances Section */}
        <section className="pt-8 border-t border-white/10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-serif font-bold text-white mb-3">
              Upcoming Performances
            </h2>
            <p className="text-gray-300 max-w-xl mx-auto text-sm md:text-base">
              Concert schedule and live orchestral performance dates.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
            <p className="text-gray-300 text-lg mb-2">No upcoming public performances scheduled at this time.</p>
            <p className="text-gray-400 text-sm mb-6">
              Check back soon for season announcements or browse our media studio releases.
            </p>
            <Link
              href="/performances"
              className="bg-[#D4AF37] text-black font-semibold px-5 py-2.5 rounded-xl text-sm inline-block"
            >
              Performance Calendar
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
