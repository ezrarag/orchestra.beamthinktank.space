'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowLeft,
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  PieChart
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRequireRole } from '@/lib/hooks/useUserRole'

export default function ProjectAnalyticsPage() {
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
    const fetchData = async () => {
      try {
        if (!db) {
          setLoading(false)
          return
        }

        // Fetch project
        const projectRef = doc(db, 'projects', projectId)
        const projectSnap = await getDoc(projectRef)
        
        if (projectSnap.exists()) {
          const projectData = projectSnap.data()
          setProject({ 
            id: projectSnap.id, 
            ...projectData,
            budgetUsd: projectData.budgetUsd || (projectId === 'black-diaspora-symphony' ? 15000 : 0)
          })
        } else {
          setProject({
            id: projectId,
            name: projectId === 'black-diaspora-symphony' 
              ? 'Black Diaspora Symphony Orchestra'
              : 'Project',
            budgetUsd: projectId === 'black-diaspora-symphony' ? 15000 : 0
          })
        }

        // Fetch musicians
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
        console.error('Error fetching analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchData()
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

  const totalBudget = project?.budgetUsd || (projectId === 'black-diaspora-symphony' ? 15000 : 0)
  const confirmedMusicians = musicians.filter(m => m.status === 'confirmed' || m.status === 'Confirmed')
  const allocationPerMusician = confirmedMusicians.length > 0 
    ? totalBudget / confirmedMusicians.length 
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <Link href={`/admin/projects/${projectId}`} className="hover:text-orchestra-gold transition-colors">
            {project?.name || projectId}
          </Link>
          <span>/</span>
          <span className="text-orchestra-gold">Analytics</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/admin/projects/${projectId}`}
              className="flex items-center space-x-2 text-orchestra-cream hover:text-orchestra-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-orchestra-gold mb-2">
                Budget Analytics
              </h1>
              <p className="text-orchestra-cream/70">
                {project?.name || projectId} - Financial breakdown and allocation
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Budget Overview */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Total Budget</span>
            <DollarSign className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">
            ${totalBudget.toLocaleString()}
          </p>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Confirmed Musicians</span>
            <Users className="h-5 w-5 text-orchestra-gold" />
          </div>
          <p className="text-3xl font-bold text-orchestra-gold">
            {confirmedMusicians.length}
          </p>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Per Musician</span>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-blue-400">
            ${allocationPerMusician > 0 ? allocationPerMusician.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
          </p>
        </div>
      </motion.div>

      {/* Musician Budget Allocation Table */}
      <motion.div
        className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="p-6 border-b border-orchestra-gold/20">
          <h2 className="text-xl font-bold text-orchestra-gold flex items-center">
            <PieChart className="h-6 w-6 mr-2" />
            Budget Allocation by Musician
          </h2>
          <p className="text-orchestra-cream/70 text-sm mt-1">
            {confirmedMusicians.length} confirmed musician{confirmedMusicians.length !== 1 ? 's' : ''} receiving allocation
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-orchestra-gold/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                  Musician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                  Instrument
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                  Allocation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orchestra-gold/10">
              {confirmedMusicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-orchestra-cream/70">
                    No confirmed musicians yet
                  </td>
                </tr>
              ) : (
                confirmedMusicians.map((musician, index) => {
                  const percentage = totalBudget > 0 ? (allocationPerMusician / totalBudget) * 100 : 0
                  return (
                    <motion.tr
                      key={musician.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="hover:bg-orchestra-gold/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-orchestra-cream font-medium">
                        {musician.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-orchestra-cream/70">
                        {musician.instrument || 'TBD'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          Confirmed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-green-400 font-semibold">
                        ${allocationPerMusician.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-6 py-4 text-orchestra-cream/70">
                        {percentage.toFixed(1)}%
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
            {confirmedMusicians.length > 0 && (
              <tfoot className="bg-orchestra-gold/5">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-orchestra-cream font-bold">
                    Total
                  </td>
                  <td className="px-6 py-4 text-green-400 font-bold text-lg">
                    ${totalBudget.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-orchestra-cream/70 font-bold">
                    100%
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>

      {/* Additional Metrics */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <h3 className="text-lg font-bold text-orchestra-gold mb-4">Budget Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Total Budget</span>
              <span className="text-orchestra-cream font-semibold">${totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Allocated to Musicians</span>
              <span className="text-green-400 font-semibold">
                ${(allocationPerMusician * confirmedMusicians.length).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Remaining</span>
              <span className="text-orchestra-cream font-semibold">
                ${(totalBudget - (allocationPerMusician * confirmedMusicians.length)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <h3 className="text-lg font-bold text-orchestra-gold mb-4">Musician Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Confirmed</span>
              <span className="text-green-400 font-semibold">{confirmedMusicians.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Pending/Interested</span>
              <span className="text-yellow-400 font-semibold">
                {musicians.filter(m => m.status !== 'confirmed' && m.status !== 'Confirmed').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-orchestra-cream/70">Total Musicians</span>
              <span className="text-orchestra-cream font-semibold">{musicians.length}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

