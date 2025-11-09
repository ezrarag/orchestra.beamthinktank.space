'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  FolderOpen, 
  Users, 
  Coins, 
  Plus,
  TrendingUp,
  Calendar,
  MapPin,
  UserPlus,
  X,
  Mail,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  QrCode,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { collection, getDocs, query, where, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'
import { useRouter } from 'next/navigation'

// Mock data for initial development
const mockData = {
  organizations: [
    { id: '1', name: 'Black Diaspora Symphony Orchestra', city: 'Milwaukee', status: 'active' },
    { id: '2', name: 'Atlanta Community Orchestra', city: 'Atlanta', status: 'active' },
    { id: '3', name: 'Orlando Youth Symphony', city: 'Orlando', status: 'planning' },
  ],
  projects: [
    { 
      id: 'black-diaspora-symphony', 
      organizationId: '1', 
      name: 'Black Diaspora Symphony Orchestra', 
      city: 'Milwaukee', 
      status: 'active',
      currentMusicians: 45,
      neededMusicians: 60,
      budgetUsd: 25000,
      beamCoinsTotal: 1260,
      subscriptionActive: true
    },
    { 
      id: 'atlanta-spring-concert', 
      organizationId: '2', 
      name: 'Spring Community Concert', 
      city: 'Atlanta', 
      status: 'planning',
      currentMusicians: 12,
      neededMusicians: 45,
      budgetUsd: 15000,
      beamCoinsTotal: 900,
      subscriptionActive: false
    },
  ],
  musicians: [
    { id: '1', name: 'Yolanda Odufuwa', city: 'Milwaukee', status: 'active', beamCoinsBalance: 45 },
    { id: '2', name: 'Nicole Gabriel', city: 'Milwaukee', status: 'active', beamCoinsBalance: 32 },
    { id: '3', name: 'Maya Schiek', city: 'Milwaukee', status: 'active', beamCoinsBalance: 28 },
  ]
}

interface DashboardStats {
  totalOrganizations: number
  activeProjects: number
  totalMusicians: number
  totalBeamCoins: number
  // BDSO-specific stats
  bdsoTotalMusicians: number
  bdsoConfirmedMusicians: number
  bdsoPendingMusicians: number
  totalAttendanceCheckIns: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, role } = useUserRole()
  const partnerProjectId = usePartnerProject()
  
  // Redirect partner_admins to their project page
  useEffect(() => {
    if (role === 'partner_admin' && partnerProjectId) {
      router.push(`/admin/projects/${partnerProjectId}`)
    }
  }, [role, partnerProjectId, router])
  
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    activeProjects: 0,
    totalMusicians: 0,
    totalBeamCoins: 0,
    bdsoTotalMusicians: 0,
    bdsoConfirmedMusicians: 0,
    bdsoPendingMusicians: 0,
    totalAttendanceCheckIns: 0
  })
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [gmailScanning, setGmailScanning] = useState(false)
  const [docsScanning, setDocsScanning] = useState(false)
  const [gmailResults, setGmailResults] = useState<any[] | null>(null)
  const [docsResults, setDocsResults] = useState<any[] | null>(null)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const [showDocsModal, setShowDocsModal] = useState(false)
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
    const fetchStats = async () => {
      try {
        if (!db) {
          // Fallback to mock data if Firebase not initialized
          const totalBeamCoins = mockData.musicians.reduce((sum, musician) => sum + musician.beamCoinsBalance, 0)
          setStats({
            totalOrganizations: mockData.organizations.length,
            activeProjects: mockData.projects.filter(p => p.status === 'active').length,
            totalMusicians: mockData.musicians.length,
            totalBeamCoins,
            bdsoTotalMusicians: 0,
            bdsoConfirmedMusicians: 0,
            bdsoPendingMusicians: 0,
            totalAttendanceCheckIns: 0
          })
          setLoading(false)
          return
        }

        // Fetch BDSO project musicians
        const bdsoMusiciansQuery = query(
          collection(db, 'projectMusicians'),
          where('projectId', '==', 'black-diaspora-symphony')
        )
        const bdsoMusiciansSnapshot = await getDocs(bdsoMusiciansQuery)
        const bdsoMusicians = bdsoMusiciansSnapshot.docs.map(doc => doc.data())
        
        const bdsoTotal = bdsoMusicians.length
        const bdsoConfirmed = bdsoMusicians.filter(m => m.status === 'confirmed' || m.status === 'Confirmed').length
        const bdsoPending = bdsoMusicians.filter(m => m.status === 'pending' || m.status === 'Pending' || m.status === 'interested' || m.status === 'Interested').length

        // Fetch attendance check-ins
        const attendanceQuery = query(
          collection(db, 'attendance'),
          orderBy('timestamp', 'desc')
        )
        const attendanceSnapshot = await getDocs(attendanceQuery)
        const totalCheckIns = attendanceSnapshot.size

        // Fallback stats (can be enhanced later)
        const totalBeamCoins = mockData.musicians.reduce((sum, musician) => sum + musician.beamCoinsBalance, 0)
        
        setStats({
          totalOrganizations: mockData.organizations.length,
          activeProjects: mockData.projects.filter(p => p.status === 'active').length,
          totalMusicians: mockData.musicians.length,
          totalBeamCoins,
          bdsoTotalMusicians: bdsoTotal,
          bdsoConfirmedMusicians: bdsoConfirmed,
          bdsoPendingMusicians: bdsoPending,
          totalAttendanceCheckIns: totalCheckIns
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    if (user) {
      checkGoogleConnection()
    }
  }, [user])

  const checkGoogleConnection = async () => {
    try {
      const token = await user?.getIdToken()
      if (!token) return

      // Check if Google is connected by trying to get tokens
      const response = await fetch('/api/google/check', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        setGoogleConnected(true)
      }
    } catch (error) {
      // Not connected
      setGoogleConnected(false)
    }
  }

  const handleConnectGoogle = async () => {
    try {
      const token = await user?.getIdToken()
      if (!token) {
        alert('Please sign in to connect Google')
        return
      }

      const response = await fetch('/api/google/auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Failed to initiate Google connection: ${error.error}`)
        return
      }

      const data = await response.json()
      // Open OAuth flow in new window
      window.open(data.authUrl, 'google-oauth', 'width=600,height=700')
    } catch (error: any) {
      console.error('Error connecting Google:', error)
      alert(`Failed to connect Google: ${error.message}`)
    }
  }

  const handleScanGmail = async () => {
    if (!user) {
      alert('Please sign in to scan Gmail')
      return
    }

    setGmailScanning(true)
    setGmailResults(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: process.env.NEXT_PUBLIC_GMAIL_QUERY || 'subject:(join OR audition OR play OR BDSO OR orchestra)',
          maxResults: 50,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to scan Gmail')
      }

      const data = await response.json()
      setGmailResults(data.results || [])
      setShowGmailModal(true)
    } catch (error: any) {
      console.error('Gmail scan error:', error)
      alert(`Failed to scan Gmail: ${error.message}`)
    } finally {
      setGmailScanning(false)
    }
  }

  const handleSearchDocs = async () => {
    if (!user) {
      alert('Please sign in to search Google Docs')
      return
    }

    setDocsScanning(true)
    setDocsResults(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/google/docs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'name contains "roster" or name contains "audition" or name contains "musicians" or name contains "BDSO"',
          maxResults: 50,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search Google Docs')
      }

      const data = await response.json()
      setDocsResults(data.results || [])
      setShowDocsModal(true)
    } catch (error: any) {
      console.error('Docs search error:', error)
      alert(`Failed to search Google Docs: ${error.message}`)
    } finally {
      setDocsScanning(false)
    }
  }

  const handleAddFromGmail = async (candidate: any) => {
    if (!user || !db) {
      alert('Please sign in to add musicians')
      return
    }

    try {
      const emailPart = candidate.email 
        ? candidate.email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : candidate.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
      
      const docId = `${emailPart}_black-diaspora-symphony`

      const musicianData = {
        projectId: 'black-diaspora-symphony',
        instrument: candidate.instrument || 'TBD',
        name: candidate.name,
        email: candidate.email || null,
        phone: candidate.phone || null,
        status: 'pending',
        role: 'musician',
        notes: candidate.notes || null,
        source: `Gmail: ${candidate.subject}`,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      await setDoc(doc(db, 'projectMusicians', docId), musicianData, { merge: true })
      
      // Update results to mark as added
      if (gmailResults) {
        setGmailResults(gmailResults.map(r => 
          r.email === candidate.email ? { ...r, isNew: false } : r
        ))
      }

      alert(`${candidate.name} added to roster!`)
    } catch (error: any) {
      console.error('Error adding musician:', error)
      alert(`Failed to add musician: ${error.message}`)
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'orchestra-gold',
    trend 
  }: {
    title: string
    value: number | string
    icon: any
    color?: string
    trend?: { value: number; label: string }
  }) => (
    <motion.div
      className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orchestra-cream/70 text-sm font-medium">{title}</p>
          <p className={`text-3xl font-bold text-${color} mt-2`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-sm text-green-400">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/20`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </motion.div>
  )

  const ProjectRow = ({ project }: { project: any }) => {
    // Determine project ID - use actual ID if available, or generate from name
    const projectId = project.id || project.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'
    
    return (
      <motion.tr
        className="border-b border-orchestra-gold/10 hover:bg-orchestra-gold/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <td className="px-6 py-4">
          <div className="flex items-center">
            <Building2 className="h-5 w-5 text-orchestra-gold mr-3" />
            <div>
              <Link 
                href={`/admin/projects/${projectId}`}
                className="font-medium text-orchestra-cream hover:text-orchestra-gold transition-colors"
              >
                {project.name}
              </Link>
              <div className="text-sm text-orchestra-cream/70">{mockData.organizations.find(org => org.id === project.organizationId)?.name}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center text-orchestra-cream/70">
            <MapPin className="h-4 w-4 mr-2" />
            {project.city}
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.status === 'active' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {project.status}
          </span>
        </td>
        <td className="px-6 py-4 text-orchestra-cream">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-orchestra-gold" />
            <span className="font-medium">{project.currentMusicians}</span>
            <span className="text-orchestra-cream/50 mx-1">/</span>
            <span className="text-orchestra-cream/70">{project.neededMusicians}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-orchestra-cream">
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-green-400 font-medium">${project.budgetUsd.toLocaleString()}</span>
            </div>
            <div className="flex items-center text-sm text-orchestra-gold">
              <Coins className="h-3 w-3 mr-1" />
              {project.beamCoinsTotal} BEAM
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            project.subscriptionActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {project.subscriptionActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-6 py-4">
          <Link
            href={`/admin/projects/${projectId}/invites`}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-medium rounded-lg transition-colors text-sm"
          >
            <Users className="h-4 w-4" />
            <span>Invites</span>
          </Link>
        </td>
      </motion.tr>
    )
  }

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
      >
        <h1 className="text-3xl font-bold text-orchestra-gold mb-2">BEAM Admin Dashboard</h1>
        <p className="text-orchestra-cream/70">Overview of all projects, organizations, and musicians across the BEAM ecosystem</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <StatCard
          title="BDSO Total Musicians"
          value={stats.bdsoTotalMusicians}
          icon={Users}
          trend={{ value: 12, label: 'total' }}
        />
        <StatCard
          title="BDSO Confirmed"
          value={stats.bdsoConfirmedMusicians}
          icon={UserPlus}
          trend={{ value: stats.bdsoTotalMusicians > 0 ? Math.round((stats.bdsoConfirmedMusicians / stats.bdsoTotalMusicians) * 100) : 0, label: '% confirmed' }}
        />
        <StatCard
          title="BDSO Pending"
          value={stats.bdsoPendingMusicians}
          icon={Users}
          trend={{ value: stats.bdsoTotalMusicians > 0 ? Math.round((stats.bdsoPendingMusicians / stats.bdsoTotalMusicians) * 100) : 0, label: '% pending' }}
        />
        <StatCard
          title="Attendance Check-ins"
          value={stats.totalAttendanceCheckIns}
          icon={Calendar}
          color="orchestra-gold"
        />
      </motion.div>

      {/* Additional Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <StatCard
          title="Total Organizations"
          value={stats.totalOrganizations}
          icon={Building2}
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={FolderOpen}
        />
        <StatCard
          title="Total Musicians"
          value={stats.totalMusicians}
          icon={Users}
        />
        <StatCard
          title="BEAM Coin Economy"
          value={`${stats.totalBeamCoins.toLocaleString()} BEAM`}
          icon={Coins}
          color="orchestra-gold"
        />
      </motion.div>

      {/* Google Integration Section */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Gmail Scan Card */}
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-blue-400" />
              <h3 className="text-lg font-bold text-orchestra-gold">Gmail Scan</h3>
            </div>
            {googleConnected && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                Connected
              </span>
            )}
          </div>
          <p className="text-orchestra-cream/70 text-sm mb-4">
            Scan Gmail inbox for musician inquiries and join requests
          </p>
          <div className="space-y-3">
            {!googleConnected && (
              <motion.button
                onClick={handleConnectGoogle}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Connect Google Account
              </motion.button>
            )}
            {googleConnected && (
              <>
                <motion.button
                  onClick={handleScanGmail}
                  disabled={gmailScanning}
                  className="w-full px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 text-orchestra-dark font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {gmailScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Scan Gmail for Musicians</span>
                    </>
                  )}
                </motion.button>
                {gmailResults && (
                  <div className="mt-3 p-3 bg-orchestra-dark/50 rounded-lg border border-orchestra-gold/20">
                    <p className="text-sm text-orchestra-cream/70">
                      Found <span className="font-bold text-orchestra-gold">{gmailResults.filter(r => r.isNew).length}</span> new potential musicians
                    </p>
                    <button
                      onClick={() => setShowGmailModal(true)}
                      className="text-xs text-orchestra-gold hover:text-orchestra-gold/80 mt-2"
                    >
                      View Results →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Google Docs Search Card */}
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-purple-400" />
              <h3 className="text-lg font-bold text-orchestra-gold">Google Docs</h3>
            </div>
            {googleConnected && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                Connected
              </span>
            )}
          </div>
          <p className="text-orchestra-cream/70 text-sm mb-4">
            Search Google Drive for roster documents and audition lists
          </p>
          <div className="space-y-3">
            {!googleConnected && (
              <motion.button
                onClick={handleConnectGoogle}
                className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Connect Google Account
              </motion.button>
            )}
            {googleConnected && (
              <>
                <motion.button
                  onClick={handleSearchDocs}
                  disabled={docsScanning}
                  className="w-full px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 text-orchestra-dark font-bold rounded-lg transition-colors flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {docsScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Search Google Docs</span>
                    </>
                  )}
                </motion.button>
                {docsResults && (
                  <div className="mt-3 p-3 bg-orchestra-dark/50 rounded-lg border border-orchestra-gold/20">
                    <p className="text-sm text-orchestra-cream/70">
                      Found <span className="font-bold text-orchestra-gold">{docsResults.length}</span> relevant documents
                    </p>
                    <button
                      onClick={() => setShowDocsModal(true)}
                      className="text-xs text-orchestra-gold hover:text-orchestra-gold/80 mt-2"
                    >
                      View Results →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Projects Table */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="p-6 border-b border-orchestra-gold/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-orchestra-gold">Active Projects</h2>
            <motion.button
              className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-medium rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </motion.button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-orchestra-gold/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Participants</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orchestra-gold/10">
              {mockData.projects.map((project, index) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Link
          href="/admin/qr-codes"
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <QrCode className="h-8 w-8 text-purple-400 group-hover:scale-110 transition-transform" />
            <ArrowLeft className="h-5 w-5 text-orchestra-cream/50 group-hover:text-purple-400 transition-colors rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-purple-400 mb-2">QR Codes</h3>
          <p className="text-orchestra-cream/70 text-sm">Generate and print QR codes for rehearsal check-ins</p>
        </Link>

        <motion.div
          className="bg-gradient-to-r from-orchestra-gold/20 to-orchestra-brown/20 backdrop-blur-sm rounded-xl border border-orchestra-gold/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-orchestra-gold mb-2">Recent Activity</h3>
          <p className="text-orchestra-cream/70 text-sm">3 new auditions submitted this week</p>
        </motion.div>
        
        <motion.div
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-blue-400 mb-2">Upcoming Events</h3>
          <p className="text-orchestra-cream/70 text-sm">2 rehearsals scheduled for next week</p>
        </motion.div>
        
        <motion.div
          className="bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-bold text-green-400 mb-2">System Health</h3>
          <p className="text-orchestra-cream/70 text-sm">All systems operational</p>
        </motion.div>
      </motion.div>

      {/* Gmail Results Modal */}
      {showGmailModal && gmailResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowGmailModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-orchestra-gold/30 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orchestra-gold">Gmail Scan Results</h2>
              <button
                onClick={() => setShowGmailModal(false)}
                className="text-orchestra-cream/70 hover:text-orchestra-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex items-center space-x-4 text-sm">
              <span className="text-orchestra-cream/70">
                Total: <span className="font-bold text-orchestra-gold">{gmailResults.length}</span>
              </span>
              <span className="text-green-400">
                New: <span className="font-bold">{gmailResults.filter(r => r.isNew).length}</span>
              </span>
              <span className="text-orchestra-cream/50">
                Existing: <span className="font-bold">{gmailResults.filter(r => !r.isNew).length}</span>
              </span>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {gmailResults.map((candidate, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    candidate.isNew 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-orchestra-dark/50 border-orchestra-gold/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-bold text-orchestra-cream">{candidate.name}</h3>
                        {candidate.isNew && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-orchestra-cream/70 mb-1">{candidate.email}</p>
                      {candidate.phone && (
                        <p className="text-sm text-orchestra-cream/70 mb-1">Phone: {candidate.phone}</p>
                      )}
                      {candidate.instrument && (
                        <p className="text-sm text-orchestra-cream/70 mb-1">Instrument: {candidate.instrument}</p>
                      )}
                      <p className="text-xs text-orchestra-cream/50 mt-2">{candidate.snippet}</p>
                    </div>
                    {candidate.isNew && (
                      <button
                        onClick={() => handleAddFromGmail(candidate)}
                        className="ml-4 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors text-sm"
                      >
                        Add to Roster
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Google Docs Results Modal */}
      {showDocsModal && docsResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowDocsModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-orchestra-gold/30 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orchestra-gold">Google Docs Results</h2>
              <button
                onClick={() => setShowDocsModal(false)}
                className="text-orchestra-cream/70 hover:text-orchestra-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 text-sm text-orchestra-cream/70">
              Found <span className="font-bold text-orchestra-gold">{docsResults.length}</span> documents
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {docsResults.map((doc, index) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border bg-orchestra-dark/50 border-orchestra-gold/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-orchestra-cream mb-2">{doc.name}</h3>
                      <p className="text-xs text-orchestra-cream/50 mb-2">
                        Type: {doc.mimeType}
                      </p>
                      {doc.modifiedTime && (
                        <p className="text-xs text-orchestra-cream/50">
                          Modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {doc.webViewLink && (
                      <a
                        href={doc.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors text-sm flex items-center space-x-2"
                      >
                        <span>Open</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
