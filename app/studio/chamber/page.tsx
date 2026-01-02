'use client'

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Footer from '@/components/Footer'
import { Music, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface ChamberProject {
  id: string
  title: string
  slug: string
  description: string
  createdAt?: any
  tags?: string[]
  videos?: any[]
  thumbnailUrl?: string
}

export default function ChamberProjectsPage() {
  const [projects, setProjects] = useState<ChamberProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) return

    const q = query(collection(db, 'chamberProjects'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ChamberProject[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ChamberProject[]
        setProjects(items)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading projects:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const formatDate = (date?: any): string => {
    if (!date) return ''
    const d = date?.toDate?.() || date
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(d)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Chamber Projects
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl">
            Intimate chamber music performances, masterclasses, and collaborative projects.
          </p>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/60 text-lg">No chamber projects available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Link
                    href={`/studio/chamber/${project.slug}`}
                    className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all h-full"
                  >
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.title}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-white/10 rounded-lg mb-4 flex items-center justify-center">
                        <Music className="h-16 w-16 text-white/30" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                    <p className="text-white/70 text-sm mb-4 line-clamp-3">{project.description}</p>
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.slice(0, 3).map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {project.videos && project.videos.length > 0 && (
                      <p className="text-sm text-white/60 mb-2">
                        {project.videos.length} video{project.videos.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {project.createdAt && (
                      <p className="text-xs text-white/40 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.createdAt)}
                      </p>
                    )}
                    <div className="mt-4 flex items-center text-[#D4AF37] text-sm font-medium">
                      View Project <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
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

