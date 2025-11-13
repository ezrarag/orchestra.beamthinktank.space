'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useBoardAccess } from '@/lib/hooks/useUserRole'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, Music, Calendar, DollarSign, TrendingUp, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ProjectStats {
  totalRegistered: number
  byInstrument: Array<{
    instrument: string
    needed: number
    confirmed: number
    checkedIn: number
  }>
  attendance: {
    totalCheckIns: number
    transportationRequests: number
  }
  budget: {
    totalBudget: number
    projectedPayouts: number
    perServiceRate: number
  }
}

export default function ProjectBoardPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string || 'black-diaspora-symphony'
  const { user, role, loading, hasAccess, isReadOnly, redirect } = useBoardAccess()
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Budget configuration (can be moved to config file later)
  const BUDGET_CONFIG = {
    totalBudget: 50000, // USD
    perServiceRate: 150, // USD per rehearsal/performance
  }

  useEffect(() => {
    if (redirect) {
      router.push('/')
      return
    }

    if (!hasAccess) return

    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        setError(null)

        // Fetch project musicians
        const projectMusiciansQuery = query(
          collection(db, 'projectMusicians'),
          where('projectId', '==', projectId)
        )
        const musiciansSnapshot = await getDocs(projectMusiciansQuery)
        const musicians = musiciansSnapshot.docs.map(doc => doc.data())

        // Fetch attendance records
        const attendanceQuery = query(
          collection(db, 'attendance')
        )
        const attendanceSnapshot = await getDocs(attendanceQuery)
        const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data())

        // Calculate stats
        const totalRegistered = musicians.length
        const confirmed = musicians.filter(m => m.status === 'confirmed' || m.status === 'Confirmed').length
        
        // Group by instrument
        const instrumentMap = new Map<string, { needed: number; confirmed: number; checkedIn: Set<string> }>()
        
        // Initialize from roster data
        const instrumentNeeds: Record<string, number> = {
          'Violin I': 6,
          'Violin II': 6,
          'Viola': 6,
          'Cello': 4,
          'Bass': 3,
          'Flute': 2,
          'Clarinet': 2,
          'Horn': 4,
        }

        musicians.forEach(m => {
          const instrument = m.instrument || 'Unknown'
          if (!instrumentMap.has(instrument)) {
            instrumentMap.set(instrument, {
              needed: instrumentNeeds[instrument] || 0,
              confirmed: 0,
              checkedIn: new Set()
            })
          }
          const stats = instrumentMap.get(instrument)!
          if (m.status === 'confirmed' || m.status === 'Confirmed') {
            stats.confirmed++
          }
        })

        // Count check-ins by musician
        attendanceRecords.forEach(record => {
          const musician = musicians.find(m => m.email === record.email || m.musicianId === record.userId)
          if (musician && musician.instrument) {
            const stats = instrumentMap.get(musician.instrument)
            if (stats) {
              stats.checkedIn.add(record.userId)
            }
          }
        })

        const byInstrument = Array.from(instrumentMap.entries()).map(([instrument, data]) => ({
          instrument,
          needed: data.needed,
          confirmed: data.confirmed,
          checkedIn: data.checkedIn.size
        }))

        // Calculate attendance stats
        const totalCheckIns = attendanceRecords.length
        const transportationRequests = attendanceRecords.filter(r => r.needsTransportation === true).length

        // Calculate projected payouts
        const projectedPayouts = confirmed * BUDGET_CONFIG.perServiceRate

        setStats({
          totalRegistered,
          byInstrument,
          attendance: {
            totalCheckIns,
            transportationRequests
          },
          budget: {
            totalBudget: BUDGET_CONFIG.totalBudget,
            projectedPayouts,
            perServiceRate: BUDGET_CONFIG.perServiceRate
          }
        })
      } catch (err: any) {
        console.error('Error fetching board stats:', err)
        setError(`Failed to load statistics: ${err.message}`)
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [hasAccess, redirect, router, projectId])

  if (loading || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  if (redirect || !hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin/board"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Board Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Project Board View</h1>
          <p className="text-gray-300">
            {projectId === 'black-diaspora-symphony' ? 'Black Diaspora Symphony Orchestra' : projectId} - Read-Only Analytics
            {isReadOnly && (
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-sm">
                Read-Only Access
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-gray-300 text-sm mb-1">Total Registered</h3>
                <p className="text-3xl font-bold text-white">{stats.totalRegistered}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Music className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-gray-300 text-sm mb-1">Confirmed Musicians</h3>
                <p className="text-3xl font-bold text-white">
                  {stats.byInstrument.reduce((sum, inst) => sum + inst.confirmed, 0)}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-gray-300 text-sm mb-1">Total Check-Ins</h3>
                <p className="text-3xl font-bold text-white">{stats.attendance.totalCheckIns}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-gray-300 text-sm mb-1">Projected Payouts</h3>
                <p className="text-3xl font-bold text-white">
                  ${stats.budget.projectedPayouts.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Instrument Breakdown Table */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Instrument Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4 text-gray-300 font-semibold">Instrument</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Needed</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Confirmed</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Checked-In</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-semibold">Transportation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byInstrument.map((inst, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white font-medium">{inst.instrument}</td>
                        <td className="py-3 px-4 text-right text-gray-300">{inst.needed}</td>
                        <td className="py-3 px-4 text-right text-green-400 font-semibold">{inst.confirmed}</td>
                        <td className="py-3 px-4 text-right text-blue-400">{inst.checkedIn}</td>
                        <td className="py-3 px-4 text-right text-yellow-400">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Budget Summary */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Budget Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-gray-300 text-sm mb-2">Total Budget</h3>
                  <p className="text-2xl font-bold text-white">
                    ${stats.budget.totalBudget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-gray-300 text-sm mb-2">Per-Service Rate</h3>
                  <p className="text-2xl font-bold text-white">
                    ${stats.budget.perServiceRate}
                  </p>
                </div>
                <div>
                  <h3 className="text-gray-300 text-sm mb-2">Projected Payouts</h3>
                  <p className="text-2xl font-bold text-green-400">
                    ${stats.budget.projectedPayouts.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {stats.byInstrument.reduce((sum, inst) => sum + inst.confirmed, 0)} confirmed × ${stats.budget.perServiceRate}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

