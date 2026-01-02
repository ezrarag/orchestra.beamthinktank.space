'use client'

import { useState, useEffect, useMemo } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import Footer from '@/components/Footer'
import { Search, Filter, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Interview {
  id: string
  subject: string
  url: string
  transcript?: string
  tags?: string[]
  instrument?: string
  role?: string
  identityTags?: string[]
  createdAt?: any
  thumbnailUrl?: string
}

export default function InterviewsPage() {
  const { user, role } = useUserRole()
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInstrument, setSelectedInstrument] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')

  useEffect(() => {
    if (!db) return

    const q = query(collection(db, 'interviews'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Interview[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Interview[]
        setInterviews(items)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading interviews:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Extract unique values for filters
  const instruments = useMemo(() => {
    const unique = new Set<string>()
    interviews.forEach((i) => {
      if (i.instrument) unique.add(i.instrument)
    })
    return Array.from(unique).sort()
  }, [interviews])

  const roles = useMemo(() => {
    const unique = new Set<string>()
    interviews.forEach((i) => {
      if (i.role) unique.add(i.role)
    })
    return Array.from(unique).sort()
  }, [interviews])

  const allTags = useMemo(() => {
    const unique = new Set<string>()
    interviews.forEach((i) => {
      if (i.identityTags) {
        i.identityTags.forEach((tag) => unique.add(tag))
      }
      if (i.tags) {
        i.tags.forEach((tag) => unique.add(tag))
      }
    })
    return Array.from(unique).sort()
  }, [interviews])

  // Filter interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((interview) => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          interview.subject.toLowerCase().includes(query) ||
          interview.transcript?.toLowerCase().includes(query) ||
          interview.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          interview.identityTags?.some((tag) => tag.toLowerCase().includes(query))

        if (!matchesSearch) return false
      }

      // Instrument filter
      if (selectedInstrument !== 'all' && interview.instrument !== selectedInstrument) {
        return false
      }

      // Role filter
      if (selectedRole !== 'all' && interview.role !== selectedRole) {
        return false
      }

      // Tag filter
      if (selectedTag !== 'all') {
        const hasTag =
          interview.tags?.includes(selectedTag) ||
          interview.identityTags?.includes(selectedTag)
        if (!hasTag) return false
      }

      return true
    })
  }, [interviews, searchQuery, selectedInstrument, selectedRole, selectedTag])

  const formatDate = (date?: any): string => {
    if (!date) return ''
    const d = date?.toDate?.() || date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Interviews
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl">
            Conversations with musicians, composers, and artists from the BEAM network.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search interviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>

            {/* Instrument Filter */}
            {instruments.length > 0 && (
              <div className="lg:w-48">
                <select
                  value={selectedInstrument}
                  onChange={(e) => setSelectedInstrument(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="all" className="bg-black">All Instruments</option>
                  {instruments.map((inst) => (
                    <option key={inst} value={inst} className="bg-black">
                      {inst}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Role Filter */}
            {roles.length > 0 && (
              <div className="lg:w-48">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="all" className="bg-black">All Roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role} className="bg-black">
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="lg:w-48">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="all" className="bg-black">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag} className="bg-black">
                      {tag}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interview Grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/60 text-lg">
                {searchQuery || selectedInstrument !== 'all' || selectedRole !== 'all' || selectedTag !== 'all'
                  ? 'No interviews match your filters.'
                  : 'No interviews available yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInterviews.map((interview, idx) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    href={`/studio/interviews/${interview.id}`}
                    className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all h-full"
                  >
                    {interview.thumbnailUrl ? (
                      <img
                        src={interview.thumbnailUrl}
                        alt={interview.subject}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-white/10 rounded-lg mb-4 flex items-center justify-center">
                        <Users className="h-16 w-16 text-white/30" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">{interview.subject}</h3>
                    {interview.instrument && (
                      <p className="text-sm text-white/60 mb-2">{interview.instrument}</p>
                    )}
                    {interview.role && (
                      <p className="text-sm text-white/60 mb-2">{interview.role}</p>
                    )}
                    {(interview.tags || interview.identityTags) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[...(interview.tags || []), ...(interview.identityTags || [])]
                          .slice(0, 3)
                          .map((tag, tagIdx) => (
                            <span
                              key={tagIdx}
                              className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    )}
                    {interview.createdAt && (
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(interview.createdAt)}
                      </p>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

