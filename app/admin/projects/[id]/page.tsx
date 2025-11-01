'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowLeft,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Coins,
  UserPlus,
  Settings,
  BarChart3,
  FileText,
  Mail
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRequireRole } from '@/lib/hooks/useUserRole'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { hasAccess, loading: roleLoading, redirect } = useRequireRole('beam_admin')
  
  const [project, setProject] = useState<any>(null)
  const [musicians, setMusicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (roleLoading) return
    
    if (redirect || !hasAccess) {
      router.push('/admin/dashboard')
    }
  }, [hasAccess, redirect, roleLoading, router])

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        if (!db) {
          // Fallback to mock data
          setProject({
            id: projectId,
            name: projectId === 'black-diaspora-symphony' 
              ? 'Black Diaspora Symphony Orchestra'
              : 'Spring Community Concert',
            city: 'Milwaukee',
            status: 'active',
            description: 'A collaborative project celebrating Black musical tradition through classical works.',
            currentMusicians: 45,
            neededMusicians: 60,
            budgetUsd: 25000,
            beamCoinsTotal: 1260,
            startDate: '2025-06-01',
            endDate: '2025-08-31'
          })
          setLoading(false)
          return
        }

        // Fetch project document
        const projectRef = doc(db, 'projects', projectId)
        const projectSnap = await getDoc(projectRef)
        
        if (projectSnap.exists()) {
          setProject({ id: projectSnap.id, ...projectSnap.data() })
        } else {
          // Fallback to mock data if not found
          setProject({
            id: projectId,
            name: projectId === 'black-diaspora-symphony' 
              ? 'Black Diaspora Symphony Orchestra'
              : 'Spring Community Concert',
            city: 'Milwaukee',
            status: 'active',
            currentMusicians: 45,
            neededMusicians: 60
          })
        }

        // Fetch project musicians
        const musiciansQuery = query(
          collection(db, 'projectMusicians'),
          where('projectId', '==', projectId)
        )
        const musiciansSnapshot = await getDocs(musiciansQuery)
        const musiciansData = musiciansSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setMusicians(musiciansData)
      } catch (error) {
        console.error('Error fetching project data:', error)
        // Set fallback data
        setProject({
          id: projectId,
          name: projectId === 'black-diaspora-symphony' 
            ? 'Black Diaspora Symphony Orchestra'
            : 'Spring Community Concert',
          city: 'Milwaukee',
          status: 'active',
          currentMusicians: 45,
          neededMusicians: 60
        })
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  if (redirect || !hasAccess) {
    return null
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-orchestra-cream/70">Project not found</p>
        <Link href="/admin/projects" className="text-orchestra-gold hover:underline mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    )
  }

  const progressPercentage = project.neededMusicians 
    ? (project.currentMusicians / project.neededMusicians) * 100 
    : 0

  return (
    <div className="space-y-8">
      {/* Header with Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-2 text-sm text-orchestra-cream/70 mb-4">
          <Link href="/admin/dashboard" className="hover:text-orchestra-gold transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/admin/projects" className="hover:text-orchestra-gold transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="text-orchestra-gold">{project.name || projectId}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/projects"
              className="flex items-center space-x-2 text-orchestra-cream hover:text-orchestra-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-orchestra-gold mb-2">
                {project.name || projectId}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-orchestra-cream/70">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {project.city || 'Unknown'}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active' 
                    ? 'bg-green-500/20 text-green-400' 
                    : project.status === 'planning'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {project.status || 'active'}
                </span>
              </div>
            </div>
          </div>

          {/* Invite Button */}
          <Link
            href={`/admin/projects/${projectId}/invites`}
            className="flex items-center space-x-2 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-all shadow-lg hover:shadow-orchestra-gold/20"
          >
            <UserPlus className="h-5 w-5" />
            <span>Manage Invites</span>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Musicians</span>
            <Users className="h-5 w-5 text-orchestra-gold" />
          </div>
          <p className="text-2xl font-bold text-orchestra-gold">
            {project.currentMusicians || musicians.length}/{project.neededMusicians || 60}
          </p>
          <div className="mt-3 w-full bg-orchestra-gold/10 rounded-full h-2">
            <div 
              className="bg-orchestra-gold h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Budget</span>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            ${project.budgetUsd?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">BEAM Coins</span>
            <Coins className="h-5 w-5 text-orchestra-gold" />
          </div>
          <p className="text-2xl font-bold text-orchestra-gold">
            {project.beamCoinsTotal?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Progress</span>
            <BarChart3 className="h-5 w-5 text-orchestra-gold" />
          </div>
          <p className="text-2xl font-bold text-orchestra-gold">
            {Math.round(progressPercentage)}%
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Link
          href={`/admin/projects/${projectId}/invites`}
          className="bg-gradient-to-r from-orchestra-gold/20 to-orchestra-gold/10 backdrop-blur-sm rounded-xl border border-orchestra-gold/30 p-6 hover:border-orchestra-gold/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <UserPlus className="h-8 w-8 text-orchestra-gold group-hover:scale-110 transition-transform" />
            <ArrowLeft className="h-5 w-5 text-orchestra-cream/50 group-hover:text-orchestra-gold transition-colors rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-orchestra-gold mb-2">Manage Invites</h3>
          <p className="text-orchestra-cream/70 text-sm">Invite musicians and manage prospect confirmations</p>
        </Link>

        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-blue-400 mb-2">Analytics</h3>
          <p className="text-orchestra-cream/70 text-sm">View project performance and metrics</p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6">
          <div className="flex items-center justify-between mb-3">
            <Settings className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-lg font-bold text-green-400 mb-2">Settings</h3>
          <p className="text-orchestra-cream/70 text-sm">Configure project settings and preferences</p>
        </div>
      </motion.div>

      {/* Project Musicians List */}
      {musicians.length > 0 && (
        <motion.div
          className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="p-6 border-b border-orchestra-gold/20">
            <h2 className="text-xl font-bold text-orchestra-gold">Project Musicians</h2>
            <p className="text-orchestra-cream/70 text-sm mt-1">{musicians.length} musician{musicians.length !== 1 ? 's' : ''} confirmed</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {musicians.slice(0, 9).map((musician) => (
                <div
                  key={musician.id}
                  className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-orchestra-gold/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-orchestra-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-orchestra-cream truncate">
                        {musician.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-orchestra-cream/70 truncate">
                        {musician.instrument || 'Musician'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {musicians.length > 9 && (
              <p className="text-center text-orchestra-cream/70 text-sm mt-4">
                + {musicians.length - 9} more musician{musicians.length - 9 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

