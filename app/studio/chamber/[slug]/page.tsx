'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import Footer from '@/components/Footer'
import { Play, Calendar, Users, FileText, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface ChamberVideo {
  id: string
  title: string
  url: string
  thumbnailUrl?: string
  createdAt?: any
  notes?: string
}

interface Interview {
  id: string
  subject: string
  url: string
  transcript?: string
  tags?: string[]
}

interface Overlay {
  id: string
  title: string
  type: 'masterclass' | 'analysis' | 'context'
  content: string
  timestamp?: number
}

interface ChamberProject {
  id: string
  title: string
  slug: string
  description: string
  createdAt?: any
  tags?: string[]
  videos?: ChamberVideo[]
  interviews?: Interview[]
  overlays?: Overlay[]
}

export default function ChamberProjectPage() {
  const params = useParams()
  const slug = params.slug as string
  const { user, role } = useUserRole()
  const [project, setProject] = useState<ChamberProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<ChamberVideo | null>(null)

  useEffect(() => {
    const loadProject = async () => {
      if (!db) return

      try {
        const q = query(collection(db, 'chamberProjects'), where('slug', '==', slug))
        const snapshot = await getDocs(q)

        if (snapshot.empty) {
          setLoading(false)
          return
        }

        const projectData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data(),
        } as ChamberProject

        setProject(projectData)
        
        // Set latest video as selected
        if (projectData.videos && projectData.videos.length > 0) {
          const sortedVideos = [...projectData.videos].sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0)
            const bDate = b.createdAt?.toDate?.() || new Date(0)
            return bDate.getTime() - aDate.getTime()
          })
          setSelectedVideo(sortedVideos[0])
        }
      } catch (error) {
        console.error('Error loading project:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [slug])

  const formatDate = (date?: any): string => {
    if (!date) return ''
    const d = date?.toDate?.() || date
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Project Not Found</h1>
          <Link href="/studio" className="text-[#D4AF37] hover:text-[#B8941F]">
            ← Back to Studio
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const latestVideo = project.videos && project.videos.length > 0
    ? [...project.videos].sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || new Date(0)
        return bDate.getTime() - aDate.getTime()
      })[0]
    : null

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <Link href="/studio" className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-[#B8941F] mb-6">
            <ArrowLeft className="h-5 w-5" />
            Back to Studio
          </Link>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {project.title}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mb-6">
            {project.description}
          </p>
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white/10 text-white/70 text-sm rounded-full border border-white/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest Video */}
      {latestVideo && (
        <section className="px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Latest Video</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <video
                src={latestVideo.url}
                controls
                poster={latestVideo.thumbnailUrl}
                className="w-full rounded-lg border border-white/10 bg-black max-h-[600px]"
              >
                Your browser does not support the video tag.
              </video>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-white mb-2">{latestVideo.title}</h3>
                {latestVideo.notes && (
                  <p className="text-white/70">{latestVideo.notes}</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Timeline - All Takes */}
      {project.videos && project.videos.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="h-8 w-8 text-[#D4AF37]" />
              Timeline - All Takes
            </h2>
            <div className="space-y-4">
              {[...project.videos]
                .sort((a, b) => {
                  const aDate = a.createdAt?.toDate?.() || new Date(0)
                  const bDate = b.createdAt?.toDate?.() || new Date(0)
                  return bDate.getTime() - aDate.getTime()
                })
                .map((video) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all cursor-pointer"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="flex items-start gap-4">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-32 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-32 h-20 bg-white/10 rounded-lg flex items-center justify-center">
                          <Play className="h-8 w-8 text-white/50" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{video.title}</h3>
                        {video.createdAt && (
                          <p className="text-sm text-white/60 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(video.createdAt)}
                          </p>
                        )}
                        {video.notes && (
                          <p className="text-sm text-white/70 mt-2">{video.notes}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Masterclass Overlays */}
      {project.overlays && project.overlays.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="h-8 w-8 text-[#D4AF37]" />
              Masterclass Overlays
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {project.overlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-white">{overlay.title}</h3>
                    <span className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs rounded-full">
                      {overlay.type}
                    </span>
                  </div>
                  <p className="text-white/70">{overlay.content}</p>
                  {overlay.timestamp && (
                    <p className="text-sm text-white/60 mt-2">
                      Timestamp: {Math.floor(overlay.timestamp / 60)}:{(overlay.timestamp % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Interviews */}
      {project.interviews && project.interviews.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
              <Users className="h-8 w-8 text-[#D4AF37]" />
              Related Interviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {project.interviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/studio/interviews/${interview.id}`}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#D4AF37]/50 transition-all"
                >
                  <h3 className="text-lg font-bold text-white mb-2">{interview.subject}</h3>
                  {interview.tags && interview.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {interview.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-white/60">View interview →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Historical Context - Placeholder */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-6">Historical Context</h2>
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/60">Historical context content coming soon...</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

