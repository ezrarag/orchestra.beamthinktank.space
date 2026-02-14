'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, Music, ArrowRight, MapPin } from 'lucide-react'
import Footer from '@/components/Footer'
import {
  CHAMBER_SERIES_FILTERS,
  listChamberSeriesProjects,
  type ChamberProject,
} from '@/lib/chamberProjects'

export default function ChamberProjectsPage() {
  const [projects, setProjects] = useState<ChamberProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadProjects = async () => {
      try {
        const items = await listChamberSeriesProjects()
        if (!mounted) return
        setProjects(items)
      } catch (error) {
        console.error('Error loading chamber projects:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProjects()

    return () => {
      mounted = false
    }
  }, [])

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Date TBD'
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-black">
      <section className="border-b border-white/10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Chamber Series
          </h1>
          <p className="max-w-3xl text-lg text-white/80 md:text-xl">
            Session archive for chamber projects with multi-version recordings and switchable mixes.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <span className="rounded-full border border-white/20 px-3 py-1">series: {CHAMBER_SERIES_FILTERS.series}</span>
            <span className="rounded-full border border-white/20 px-3 py-1">discipline: {CHAMBER_SERIES_FILTERS.discipline}</span>
            <span className="rounded-full border border-white/20 px-3 py-1">location: {CHAMBER_SERIES_FILTERS.location}</span>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-[#D4AF37]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="text-lg text-white/70">No published chamber projects match these filters yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Link
                    href={`/studio/chamber/${project.id}`}
                    className="block h-full rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-[#D4AF37]/50"
                  >
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.title}
                        className="mb-4 h-48 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="mb-4 flex h-48 w-full items-center justify-center rounded-lg bg-white/10">
                        <Music className="h-14 w-14 text-white/30" />
                      </div>
                    )}

                    <h2 className="mb-2 text-2xl font-bold text-white">{project.title}</h2>
                    {project.composer && (
                      <p className="mb-2 text-sm text-white/70">Composer: {project.composer}</p>
                    )}
                    {project.instrumentation && (
                      <p className="mb-3 text-sm text-white/70">Instrumentation: {project.instrumentation}</p>
                    )}
                    {project.description && (
                      <p className="line-clamp-3 text-sm text-white/70">{project.description}</p>
                    )}

                    <div className="mt-5 space-y-1 text-xs text-white/50">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        Updated {formatDate(project.updatedAt ?? project.createdAt)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {project.location || CHAMBER_SERIES_FILTERS.location}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center text-sm font-medium text-[#D4AF37]">
                      Open Project <ArrowRight className="ml-2 h-4 w-4" />
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
