'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Music, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useUserRole } from '@/lib/hooks/useUserRole'

const availableProjects = [
  {
    id: 'black-diaspora-symphony',
    title: 'Black Diaspora Symphony Orchestra',
    description: 'Join the Black Diaspora Symphony Orchestra for the 2025 Annual Memorial Concert. Perform works by Margaret Bonds, Maurice Ravel, and Edvard Grieg.',
    image: 'https://firebasestorage.googleapis.com/v0/b/beam-orchestra-platform.firebasestorage.app/o/pexels-afroromanzo-4028878.jpg?alt=media&token=b95bbe32-cc29-4ff7-815a-3dd558efa561',
  }
]

const projectRoutes: Record<string, string> = {
  'black-diaspora-symphony': '/training/contract-projects/black-diaspora-symphony'
}

export default function SelectProjectPage() {
  const router = useRouter()
  const { user, loading } = useUserRole()
  const [selectedProject, setSelectedProject] = useState<string | null>(null)

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId)
    const projectRoute = projectRoutes[projectId]
    
    // If user is already authenticated, go directly to project page
    if (user && projectRoute) {
      setTimeout(() => {
        router.push(projectRoute)
      }, 200)
    } else {
      // Otherwise, go to login page
      setTimeout(() => {
        router.push(`/musician/login/${projectId}`)
      }, 200)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-2xl w-full shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Music className="w-8 h-8 text-[#D4AF37]" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Select a Project
          </h1>
          <p className="text-gray-300 text-sm">
            Choose a project to access your musician portal
          </p>
        </div>

        <div className="space-y-4">
          {availableProjects.map((project, index) => (
            <motion.button
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              onClick={() => handleSelectProject(project.id)}
              disabled={selectedProject !== null}
              className={`w-full bg-white/5 hover:bg-white/10 border-2 rounded-xl p-6 transition-all duration-200 text-left group ${
                selectedProject === project.id
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-white/20 hover:border-white/40'
              } ${selectedProject !== null && selectedProject !== project.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-4">
                {/* Project Image */}
                <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Project Info */}
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1 group-hover:text-[#D4AF37] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {project.description}
                  </p>
                </div>

                {/* Arrow Icon */}
                <div className={`flex-shrink-0 transition-transform ${selectedProject === project.id ? 'translate-x-2' : ''}`}>
                  <ArrowRight className="w-5 h-5 text-white/60 group-hover:text-[#D4AF37] transition-colors" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {availableProjects.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No projects available at this time.</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

