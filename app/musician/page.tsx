'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { LogIn, Home, ArrowRight, Music } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { fetchRecordingProjects, type RecordingProject } from '@/lib/api/recordingProjects'

export default function MusicianPage() {
  const router = useRouter()
  const { user } = useUserRole()
  const [isExiting, setIsExiting] = useState(false)
  const [projects, setProjects] = useState<RecordingProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWorkExperience() {
      setLoading(true)
      const data = await fetchRecordingProjects()
      setProjects(data)
      setLoading(false)
    }
    loadWorkExperience()
  }, [])

  const handleLogin = () => {
    setIsExiting(true)
    setTimeout(() => {
      router.push('/musician/select-project')
    }, 300)
  }

  return (
    <motion.div
      className="min-h-screen bg-black relative overflow-hidden flex flex-col justify-between"
      initial={{ opacity: 1, x: 0 }}
      animate={isExiting ? { opacity: 0, x: '-100%' } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Blurred Background - Right Side */}
      <div className="absolute right-0 top-0 w-full lg:w-1/2 h-full overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/pexels-afroromanzo-4028878.jpg?alt=media&token=b95bbe32-cc29-4ff7-815a-3dd558efa561"
            alt="Orchestra Background"
            fill
            className="object-cover"
            style={{
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
            }}
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-l from-black/95 via-black/85 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#D4AF37]/5" />
      </div>

      {/* Top Right - Musician Login / Select Project Button */}
      <motion.div
        className="absolute top-6 right-6 z-30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <button
          onClick={handleLogin}
          className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg"
        >
          <LogIn className="w-4 h-4" />
          {user ? 'Select / Start Project' : 'Musician Login'}
        </button>
      </motion.div>

      {/* Content Container */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Timeline Content */}
            <motion.div
              className="text-white space-y-12"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h1 className="text-[#D4AF37] font-bold text-5xl md:text-6xl leading-tight mb-4">
                  Musician Workspace
                </h1>
                <p className="text-gray-300 text-lg">
                  BEAM Orchestral Recording Projects & Production Timeline
                </p>
              </motion.div>

              {/* Timeline Projects */}
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {loading ? (
                  <div className="py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <p className="text-gray-300 text-sm mb-4">
                      No active recording projects logged yet.
                    </p>
                    <Link
                      href="/musician/select-project"
                      className="inline-flex items-center gap-2 text-[#D4AF37] text-sm font-semibold hover:underline"
                    >
                      <span>Join or propose a recording project</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                      className="relative pl-8"
                    >
                      {/* Timeline Bullet */}
                      <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-[#D4AF37]" />

                      {/* Content */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <h3 className="text-white font-bold text-lg uppercase mb-1">
                              {project.title}
                            </h3>
                            <p className="text-[#D4AF37] text-sm">
                              Composer: {project.composer} | City: {project.city}
                            </p>
                          </div>
                          <span className="bg-white/10 text-white/80 text-xs px-2.5 py-1 rounded-full uppercase">
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>

                        {project.description && (
                          <p className="text-white/80 text-sm leading-relaxed">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </motion.div>

            {/* Right Column - Spacer */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        className="relative z-20 border-t border-white/10 bg-black/50 backdrop-blur-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-[#D4AF37] transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <Link
            href="/musician/select-project"
            className="inline-flex items-center gap-2 text-[#D4AF37] hover:text-white transition-colors text-sm font-semibold"
          >
            <Music className="w-4 h-4" />
            Select / Start Project
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
