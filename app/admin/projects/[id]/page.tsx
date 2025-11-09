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
  Mail,
  ExternalLink,
  Zap,
  X
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRequireRole, useUserRole } from '@/lib/hooks/useUserRole'
import { useProjectAccess } from '@/lib/hooks/useProjectAccess'

function MusiciansList({ musicians }: { musicians: any[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayedMusicians = showAll ? musicians : musicians.slice(0, 9)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedMusicians.map((musician) => (
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
        <button
          onClick={() => setShowAll(!showAll)}
          className="block w-full text-center text-orchestra-gold hover:text-orchestra-gold/80 text-sm mt-4 transition-colors cursor-pointer"
        >
          {showAll ? (
            <>Show Less</>
          ) : (
            <>+ {musicians.length - 9} more musician{musicians.length - 9 !== 1 ? 's' : ''}</>
          )}
        </button>
      )}
    </>
  )
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const { user, role, loading: roleLoading } = useUserRole()
  const projectAccess = useProjectAccess(projectId)
  const hasAccess = role === 'beam_admin' || projectAccess.hasAccess
  const redirect = !roleLoading && (!hasAccess || !projectAccess.hasAccess)
  
  const [project, setProject] = useState<any>(null)
  const [musicians, setMusicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMusicianModal, setShowAddMusicianModal] = useState(false)
  const [newMusician, setNewMusician] = useState({
    name: '',
    email: '',
    phone: '',
    instrument: '',
    status: 'pending' as 'pending' | 'confirmed' | 'interested',
    notes: '',
    source: 'Manual Entry'
  })
  const [addingMusician, setAddingMusician] = useState(false)

  useEffect(() => {
    if (roleLoading || projectAccess.loading) return
    
    if (redirect || !hasAccess) {
      // If partner_admin, redirect to their project
      if (role === 'partner_admin') {
        router.push(`/admin/projects/${projectId}`)
      } else {
        router.push('/admin/dashboard')
      }
    }
  }, [hasAccess, redirect, roleLoading, projectAccess.loading, role, projectId, router])

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
          const projectData = projectSnap.data()
          setProject({ 
            id: projectSnap.id, 
            ...projectData,
            // Ensure budget is set for BDSO
            budgetUsd: projectData.budgetUsd || (projectId === 'black-diaspora-symphony' ? 15000 : 0)
          })
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
            neededMusicians: 60,
            budgetUsd: projectId === 'black-diaspora-symphony' ? 15000 : 0
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

  const handleAddMusician = async () => {
    if (!newMusician.name || !newMusician.name.trim()) {
      alert('Please fill in at least the musician name')
      return
    }
    
    if (!db) {
      alert('Database connection not available. Please refresh the page.')
      return
    }
    
    if (!user) {
      alert('You must be signed in to add musicians. Please sign in and try again.')
      return
    }

    setAddingMusician(true)
    try {
      // Generate unique ID
      const emailPart = newMusician.email 
        ? newMusician.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : newMusician.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      
      const docId = `${emailPart}_${projectId}`

      const musicianData = {
        projectId: projectId,
        instrument: newMusician.instrument || 'TBD',
        name: newMusician.name,
        email: newMusician.email || null,
        phone: newMusician.phone || null,
        status: newMusician.status,
        role: 'musician',
        notes: newMusician.notes || null,
        source: newMusician.source,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'projectMusicians', docId), musicianData, { merge: true })
      
      // Reset form
      setNewMusician({
        name: '',
        email: '',
        phone: '',
        instrument: '',
        status: 'pending',
        notes: '',
        source: 'Manual Entry'
      })
      setShowAddMusicianModal(false)
      
      // Refresh musicians list
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
      
      alert('Musician added successfully!')
    } catch (error: any) {
      console.error('Error adding musician:', error)
      alert(`Failed to add musician: ${error.message}`)
    } finally {
      setAddingMusician(false)
    }
  }

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

          <div className="flex items-center space-x-3">
            {/* Invite Button */}
            <Link
              href={`/admin/projects/${projectId}/invites`}
              className="flex items-center space-x-2 px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-all shadow-lg hover:shadow-orchestra-gold/20"
            >
              <UserPlus className="h-5 w-5" />
              <span>Manage Invites</span>
            </Link>

            {/* Readyaimgo Subscription Button */}
            <a
              href={`https://readyaimgo.biz/onboard?project=${projectId}&return=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space')}/admin/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-600/20"
            >
              <Zap className="h-5 w-5" />
              <span>Activate Readyaimgo</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
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

        <Link
          href={`/admin/projects/${projectId}/analytics`}
          className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6 hover:bg-orchestra-cream/10 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Budget</span>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">
            ${(project.budgetUsd || (projectId === 'black-diaspora-symphony' ? 15000 : 0)).toLocaleString()}
          </p>
          <p className="text-xs text-orchestra-cream/50 mt-1">Click to view analytics</p>
        </Link>

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

        <Link
          href={`/admin/projects/${projectId}/analytics`}
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6 hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform" />
            <ArrowLeft className="h-5 w-5 text-orchestra-cream/50 group-hover:text-blue-400 transition-colors rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-blue-400 mb-2">Analytics</h3>
          <p className="text-orchestra-cream/70 text-sm">View project performance and metrics</p>
        </Link>

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
          <div className="p-6 border-b border-orchestra-gold/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-orchestra-gold">Project Musicians</h2>
              <p className="text-orchestra-cream/70 text-sm mt-1">{musicians.length} musician{musicians.length !== 1 ? 's' : ''} confirmed</p>
            </div>
            <button
              onClick={() => setShowAddMusicianModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Musician</span>
            </button>
          </div>
          <div className="p-6">
            <MusiciansList musicians={musicians} />
          </div>
        </motion.div>
      )}

      {/* Add Musician Modal */}
      {showAddMusicianModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowAddMusicianModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-orchestra-gold/30 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orchestra-gold">Add Musician</h2>
              <button
                onClick={() => setShowAddMusicianModal(false)}
                className="text-orchestra-cream/70 hover:text-orchestra-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newMusician.name}
                  onChange={(e) => setNewMusician({ ...newMusician, name: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  placeholder="Musician name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newMusician.email}
                  onChange={(e) => setNewMusician({ ...newMusician, email: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newMusician.phone}
                  onChange={(e) => setNewMusician({ ...newMusician, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Instrument
                </label>
                <input
                  type="text"
                  value={newMusician.instrument}
                  onChange={(e) => setNewMusician({ ...newMusician, instrument: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  placeholder="Violin I, Viola, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Status
                </label>
                <select
                  value={newMusician.status}
                  onChange={(e) => setNewMusician({ ...newMusician, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                >
                  <option value="pending">Pending</option>
                  <option value="interested">Interested</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Notes
                </label>
                <textarea
                  value={newMusician.notes}
                  onChange={(e) => setNewMusician({ ...newMusician, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddMusicianModal(false)}
                  className="flex-1 px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 text-orchestra-cream rounded-lg hover:bg-orchestra-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMusician}
                  disabled={addingMusician || !newMusician.name}
                  className="flex-1 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 text-orchestra-dark font-bold rounded-lg transition-colors"
                >
                  {addingMusician ? 'Adding...' : 'Add Musician'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

