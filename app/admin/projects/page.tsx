'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  FolderOpen, 
  Building2, 
  Users, 
  MapPin, 
  Plus,
  ArrowRight,
  Calendar,
  Coins
} from 'lucide-react'
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'

// Mock projects data - in production, fetch from Firestore
const mockProjects = [
  {
    id: 'black-diaspora-symphony',
    name: 'Black Diaspora Symphony Orchestra',
    city: 'Milwaukee',
    status: 'active',
    currentMusicians: 45,
    neededMusicians: 60,
    budgetUsd: 25000,
    beamCoinsTotal: 1260,
    startDate: '2025-06-01',
    endDate: '2025-08-31'
  },
  {
    id: 'atlanta-spring-concert',
    name: 'Spring Community Concert',
    city: 'Atlanta',
    status: 'planning',
    currentMusicians: 12,
    neededMusicians: 45,
    budgetUsd: 15000,
    beamCoinsTotal: 900,
    startDate: '2025-04-01',
    endDate: '2025-05-15'
  }
]

export default function ProjectsPage() {
  const { role } = useUserRole()
  const partnerProjectId = usePartnerProject()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (db) {
          // For partner admins, only fetch their assigned project
          if (role === 'partner_admin' && partnerProjectId) {
            try {
              // Try to get project by ID directly
              const projectRef = doc(db, 'projects', partnerProjectId)
              const projectSnap = await getDoc(projectRef)
              
              if (projectSnap.exists()) {
                setProjects([{
                  id: projectSnap.id,
                  ...projectSnap.data()
                }])
              } else {
                // Fallback: fetch all and filter
                const projectsQuery = query(collection(db, 'projects'))
                const snapshot = await getDocs(projectsQuery)
                const allProjects = snapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                }))
                const filtered = allProjects.filter(p => p.id === partnerProjectId)
                setProjects(filtered.length > 0 ? filtered : mockProjects.filter(p => p.id === partnerProjectId))
              }
            } catch (error) {
              console.error('Error fetching partner project:', error)
              setProjects(mockProjects.filter(p => p.id === partnerProjectId))
            }
          } else {
            // For beam admins, fetch all projects
            const projectsQuery = query(collection(db, 'projects'))
            const snapshot = await getDocs(projectsQuery)
            
            if (!snapshot.empty) {
              const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }))
              setProjects(projectsData)
            } else {
              // Fallback to mock data
              setProjects(mockProjects)
            }
          }
        } else {
          // Fallback to mock data, filtered for partner admins
          if (role === 'partner_admin' && partnerProjectId) {
            setProjects(mockProjects.filter(p => p.id === partnerProjectId))
          } else {
            setProjects(mockProjects)
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error)
        // Fallback to mock data, filtered for partner admins
        if (role === 'partner_admin' && partnerProjectId) {
          setProjects(mockProjects.filter(p => p.id === partnerProjectId))
        } else {
          setProjects(mockProjects)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [role, partnerProjectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-orchestra-gold mb-2">Projects</h1>
          <p className="text-orchestra-cream/70">Manage all BEAM Orchestra projects</p>
        </div>
        {role === 'beam_admin' && (
          <Link
            href="/admin/projects/new"
            className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Link>
        )}
      </motion.div>

      {/* Projects Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 hover:border-orchestra-gold/40 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-orchestra-gold mb-1">{project.name}</h3>
                <div className="flex items-center text-orchestra-cream/70 text-sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  {project.city}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : project.status === 'planning'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {project.status}
              </span>
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-orchestra-cream/70">
                  <Users className="h-4 w-4 mr-2 text-orchestra-gold" />
                  <span className="text-sm">Musicians</span>
                </div>
                <span className="text-orchestra-cream font-medium">
                  {project.currentMusicians}/{project.neededMusicians}
                </span>
              </div>
              
              <div className="w-full bg-orchestra-gold/10 rounded-full h-2">
                <div 
                  className="bg-orchestra-gold h-2 rounded-full transition-all"
                  style={{ width: `${(project.currentMusicians / project.neededMusicians) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-green-400">
                  <span>${project.budgetUsd?.toLocaleString()}</span>
                </div>
                <div className="flex items-center text-orchestra-gold">
                  <Coins className="h-3 w-3 mr-1" />
                  <span>{project.beamCoinsTotal} BEAM</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Link
                href={`/admin/projects/${project.id}`}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-gold rounded-lg transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
                <span>View Details</span>
              </Link>
              <Link
                href={`/admin/projects/${project.id}/invites`}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark rounded-lg transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Invites</span>
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {projects.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <FolderOpen className="h-16 w-16 text-orchestra-cream/30 mx-auto mb-4" />
          <p className="text-orchestra-cream/70 text-lg">No projects found</p>
          <p className="text-orchestra-cream/50 text-sm mt-2">Create your first project to get started</p>
        </motion.div>
      )}
    </div>
  )
}

