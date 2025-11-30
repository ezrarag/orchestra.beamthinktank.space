'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  Users,
  Coins,
  Ticket,
  Video,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowRight,
  X
} from 'lucide-react'
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { usePartnerProject } from '@/lib/hooks/useProjectAccess'
import { useRouter } from 'next/navigation'
import MetricCard from '@/components/admin/MetricCard'
import AlertBadge from '@/components/admin/AlertBadge'
import ProjectsTable from '@/components/admin/ProjectsTable'

interface DashboardMetrics {
  activeProjects: number
  activeCities: number
  totalMusicians: number
  totalBeamCoins: number
  totalTicketsSold: number
  totalMediaUploaded: number
}

interface PulseAlert {
  overdueTasks: number
  dueSoonTasks: number
  resourceMismatches: number
  missingMedia: number
}

interface BeamCoinMetrics {
  issuedToday: number
  redeemedToday: number
  outstanding: number
  expiring: number
}

interface ProjectSnapshot {
  id: string
  name: string
  city: string
  confirmedMusicians: number
  totalMusicians: number
  progress: number
  revenue: number
  missingTasks: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, role } = useUserRole()
  const partnerProjectId = usePartnerProject()
  const isDev = process.env.NODE_ENV === 'development'

  // Redirect partner_admins to their project page
  useEffect(() => {
    if (role === 'partner_admin' && partnerProjectId) {
      router.push(`/admin/projects/${partnerProjectId}`)
    }
  }, [role, partnerProjectId, router])

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    activeProjects: 0,
    activeCities: 0,
    totalMusicians: 0,
    totalBeamCoins: 0,
    totalTicketsSold: 0,
    totalMediaUploaded: 0
  })

  const [pulseAlerts, setPulseAlerts] = useState<PulseAlert>({
    overdueTasks: 0,
    dueSoonTasks: 0,
    resourceMismatches: 0,
    missingMedia: 0
  })

  const [coinMetrics, setCoinMetrics] = useState<BeamCoinMetrics>({
    issuedToday: 0,
    redeemedToday: 0,
    outstanding: 0,
    expiring: 0
  })

  const [projects, setProjects] = useState<ProjectSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [showTicketBreakdownModal, setShowTicketBreakdownModal] = useState(false)
  const [ticketBreakdown, setTicketBreakdown] = useState<any[]>([])

  // Fetch all dashboard data
  useEffect(() => {
    if (!db || role !== 'beam_admin') {
      setLoading(false)
      return
    }

    const unsubscribeFunctions: (() => void)[] = []

    // Subscribe to projects
    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('name', 'asc')
    )
    const unsubscribeProjects = onSnapshot(projectsQuery, async (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const activeProjects = projectsData.filter((p: any) => p.status === 'active').length
      const uniqueCities = new Set(projectsData.map((p: any) => p.city).filter(Boolean))
      
      // Fetch musicians for each project
      const projectSnapshots: ProjectSnapshot[] = []
      
      for (const project of projectsData) {
        try {
          // Get confirmed musicians count
          const musiciansQuery = query(
            collection(db, 'projectMusicians'),
            where('projectId', '==', project.id),
            where('status', 'in', ['confirmed', 'Confirmed'])
          )
          const musiciansSnapshot = await getDocs(musiciansQuery)
          const confirmedCount = musiciansSnapshot.size

          // Get total needed musicians
          const totalNeeded = (project as any).neededMusicians || (project as any).maxMusicians || 0
          const progress = totalNeeded > 0 ? (confirmedCount / totalNeeded) * 100 : 0

          // Get revenue from ticket sales for this project's events
          const eventsQuery = query(
            collection(db, 'events'),
            where('projectId', '==', project.id)
          )
          const eventsSnapshot = await getDocs(eventsQuery)
          const eventIds = eventsSnapshot.docs.map(doc => doc.id)

          let revenue = 0
          if (eventIds.length > 0) {
            const ordersQuery = query(collection(db, 'eventOrders'))
            const ordersSnapshot = await getDocs(ordersQuery)
            const orders = ordersSnapshot.docs.map(doc => doc.data())
            
            revenue = orders
              .filter((o: any) => eventIds.includes(o.eventId) && o.status === 'paid')
              .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0) / 100
          }

          // Get missing tasks count (check pulseEntries or pulse_tasks)
          let missingTasks = 0
          try {
            const tasksQuery = query(
              collection(db, 'pulseEntries'),
              where('projectId', '==', project.id),
              where('priority', '==', 'high')
            )
            const tasksSnapshot = await getDocs(tasksQuery)
            missingTasks = tasksSnapshot.size
          } catch (error) {
            // Collection might not exist, that's okay
          }

          projectSnapshots.push({
            id: project.id,
            name: (project as any).name || project.id,
            city: (project as any).city || 'Unknown',
            confirmedMusicians: confirmedCount,
            totalMusicians: totalNeeded,
            progress,
            revenue,
            missingTasks
          })
        } catch (error) {
          console.error(`Error fetching data for project ${project.id}:`, error)
        }
      }

      setProjects(projectSnapshots)
      setMetrics(prev => ({
        ...prev,
        activeProjects,
        activeCities: uniqueCities.size
      }))
    })
    unsubscribeFunctions.push(unsubscribeProjects)

    // Fetch total musicians
    const musiciansQuery = query(collection(db, 'projectMusicians'))
    const unsubscribeMusicians = onSnapshot(musiciansQuery, (snapshot) => {
      const uniqueMusicians = new Set(
        snapshot.docs.map(doc => doc.data().email || doc.data().musicianId).filter(Boolean)
      )
      setMetrics(prev => ({
        ...prev,
        totalMusicians: uniqueMusicians.size
      }))
    })
    unsubscribeFunctions.push(unsubscribeMusicians)

    // Fetch ticket statistics
    const fetchTicketStats = async () => {
      try {
        const [ordersSnapshot, rsvpsSnapshot] = await Promise.all([
          getDocs(collection(db, 'eventOrders')),
          getDocs(collection(db, 'eventRSVPs'))
        ])

        const orders = ordersSnapshot.docs.map(doc => doc.data())
        const rsvps = rsvpsSnapshot.docs.map(doc => doc.data())

        const paidTickets = orders
          .filter((o: any) => o.status === 'paid' || o.status === 'pending')
          .reduce((sum: number, order: any) => {
            const ticketCount = order.tickets?.reduce((ticketSum: number, ticket: any) =>
              ticketSum + (ticket.quantity || 0), 0) || 0
            return sum + ticketCount
          }, 0)

        const rsvpReservations = rsvps.reduce((sum: number, rsvp: any) => {
          return sum + (rsvp.hasPlusOne ? 2 : 1)
        }, 0)

        setMetrics(prev => ({
          ...prev,
          totalTicketsSold: paidTickets + rsvpReservations
        }))
      } catch (error) {
        console.error('Error fetching ticket stats:', error)
      }
    }
    fetchTicketStats()

    // Fetch media count
    const mediaQuery = query(collection(db, 'projectRehearsalMedia'))
    const unsubscribeMedia = onSnapshot(mediaQuery, (snapshot) => {
      setMetrics(prev => ({
        ...prev,
        totalMediaUploaded: snapshot.size
      }))
    })
    unsubscribeFunctions.push(unsubscribeMedia)

    // Fetch BEAM Coins (if collection exists)
    const fetchCoinStats = async () => {
      try {
        // Check if beamCoins collection exists
        const coinsQuery = query(collection(db, 'beamCoins'))
        const coinsSnapshot = await getDocs(coinsQuery)
        
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = Timestamp.fromDate(today)

        let issuedToday = 0
        let redeemedToday = 0
        let outstanding = 0
        let expiring = 0

        coinsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          const issuedAt = data.issuedAt?.toDate?.() || data.createdAt?.toDate?.()
          const redeemedAt = data.redeemedAt?.toDate?.()
          const expiresAt = data.expiresAt?.toDate?.()

          if (issuedAt && issuedAt >= today) {
            issuedToday += data.amount || 0
          }
          if (redeemedAt && redeemedAt >= today) {
            redeemedToday += data.amount || 0
          }
          if (!redeemedAt) {
            outstanding += data.amount || 0
          }
          if (expiresAt && expiresAt <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            expiring += data.amount || 0
          }
        })

        setCoinMetrics({
          issuedToday,
          redeemedToday,
          outstanding,
          expiring
        })
      } catch (error) {
        // Collection might not exist, use project data instead
        const projectsSnapshot = await getDocs(collection(db, 'projects'))
        const totalCoins = projectsSnapshot.docs.reduce((sum, doc) => {
          const data = doc.data()
          return sum + (data.beamCoinsTotal || 0)
        }, 0)
        setCoinMetrics({
          issuedToday: 0,
          redeemedToday: 0,
          outstanding: totalCoins,
          expiring: 0
        })
      }
    }
    fetchCoinStats()

    // Fetch pulse alerts
    const fetchPulseAlerts = async () => {
      try {
        const now = new Date()
        const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

        // Check pulseEntries or pulse_tasks collection
        let tasksQuery
        try {
          tasksQuery = query(collection(db, 'pulse_tasks'))
        } catch {
          tasksQuery = query(collection(db, 'pulseEntries'))
        }

        const tasksSnapshot = await getDocs(tasksQuery)
        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        let overdueTasks = 0
        let dueSoonTasks = 0

        tasks.forEach((task: any) => {
          const dueDate = task.dueDate?.toDate?.() || task.dueAt?.toDate?.()
          if (dueDate) {
            if (dueDate < now) {
              overdueTasks++
            } else if (dueDate <= twoDaysFromNow) {
              dueSoonTasks++
            }
          }
        })

        // Check for resource mismatches (projects with missing musicians)
        const projectsSnapshot = await getDocs(collection(db, 'projects'))
        let resourceMismatches = 0
        projectsSnapshot.docs.forEach(doc => {
          const project = doc.data()
          const needed = project.neededMusicians || project.maxMusicians || 0
          if (needed > 0) {
            // This is a simplified check - in production, count actual musicians
            resourceMismatches++
          }
        })

        // Check for missing media (projects with no media uploads)
        const mediaSnapshot = await getDocs(collection(db, 'projectRehearsalMedia'))
        const projectsWithMedia = new Set(
          mediaSnapshot.docs.map(doc => doc.data().projectId).filter(Boolean)
        )
        const allProjects = projectsSnapshot.docs.map(doc => doc.id)
        const missingMedia = allProjects.filter(id => !projectsWithMedia.has(id)).length

        setPulseAlerts({
          overdueTasks,
          dueSoonTasks,
          resourceMismatches,
          missingMedia
        })
      } catch (error) {
        console.error('Error fetching pulse alerts:', error)
      }
    }
    fetchPulseAlerts()

    setLoading(false)

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
    }
  }, [db, role])

  const handleTicketCardClick = async () => {
    if (!db) return
    setShowTicketBreakdownModal(true)

    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'))
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      const eventsByProject: Record<string, any[]> = {}
      events.forEach(event => {
        const projectId = (event as any).projectId || 'unassigned'
        if (!eventsByProject[projectId]) {
          eventsByProject[projectId] = []
        }
        eventsByProject[projectId].push(event)
      })

      const [ordersSnapshot, rsvpsSnapshot] = await Promise.all([
        getDocs(collection(db, 'eventOrders')),
        getDocs(collection(db, 'eventRSVPs'))
      ])

      const orders = ordersSnapshot.docs.map(doc => doc.data())
      const rsvps = rsvpsSnapshot.docs.map(doc => doc.data())

      const breakdown: any[] = []
      for (const [projectId, projectEvents] of Object.entries(eventsByProject)) {
        const eventIds = projectEvents.map((e: any) => e.id)
        const projectOrders = orders.filter((o: any) => eventIds.includes(o.eventId))
        const paidTickets = projectOrders
          .filter((o: any) => o.status === 'paid' || o.status === 'pending')
          .reduce((sum: number, order: any) => {
            const ticketCount = order.tickets?.reduce((ticketSum: number, ticket: any) =>
              ticketSum + (ticket.quantity || 0), 0) || 0
            return sum + ticketCount
          }, 0)
        const revenue = projectOrders
          .filter((o: any) => o.status === 'paid')
          .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0) / 100
        const projectRSVPs = rsvps.filter((r: any) => eventIds.includes(r.eventId))
        const rsvpReservations = projectRSVPs.reduce((sum: number, rsvp: any) => {
          return sum + (rsvp.hasPlusOne ? 2 : 1)
        }, 0)

        if (paidTickets + rsvpReservations > 0 || revenue > 0) {
          breakdown.push({
            projectId,
            projectName: projectId === 'unassigned' ? 'Unassigned Events' : projectId,
            eventCount: projectEvents.length,
            paidTickets,
            rsvpReservations,
            totalTickets: paidTickets + rsvpReservations,
            revenue
          })
        }
      }
      breakdown.sort((a, b) => b.totalTickets - a.totalTickets)
      setTicketBreakdown(breakdown)
    } catch (error) {
      console.error('Error fetching ticket breakdown:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-10 py-8">
      {/* Staging Mode Ribbon */}
      {isDev && (
        <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-lg p-4 text-center">
          <p className="text-yellow-400 font-bold text-lg">STAGING MODE</p>
          <p className="text-yellow-300/70 text-sm">Development Environment</p>
        </div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-orchestra-gold mb-2">BEAM Admin Dashboard</h1>
        <p className="text-orchestra-cream/70">Macro-level overview of all projects, metrics, and system health</p>
      </motion.div>

      {/* BEAM Health Overview */}
      <section>
        <h2 className="text-2xl font-bold text-orchestra-gold mb-6">BEAM Health Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Active Projects"
            value={metrics.activeProjects}
            icon={Building2}
          />
          <MetricCard
            title="Active Cities"
            value={metrics.activeCities}
            icon={MapPin}
          />
          <MetricCard
            title="Total Musicians"
            value={metrics.totalMusicians}
            icon={Users}
          />
          <MetricCard
            title="Total BEAM Coins Issued"
            value={coinMetrics.outstanding.toLocaleString()}
            icon={Coins}
          />
          <MetricCard
            title="Total Tickets Sold"
            value={metrics.totalTicketsSold}
            icon={Ticket}
            onClick={handleTicketCardClick}
          />
          <MetricCard
            title="Total Media Uploaded"
            value={metrics.totalMediaUploaded}
            icon={Video}
          />
        </div>
      </section>

      {/* Pulse Intelligence Section */}
      <section>
        <h2 className="text-2xl font-bold text-orchestra-gold mb-6">Pulse Intelligence</h2>
        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <h3 className="text-lg font-bold text-orchestra-gold mb-4">Pulse Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AlertBadge
              type="overdue"
              count={pulseAlerts.overdueTasks}
              label="Overdue Tasks"
            />
            <AlertBadge
              type="due-soon"
              count={pulseAlerts.dueSoonTasks}
              label="Due in 48hrs"
            />
            <AlertBadge
              type="warning"
              count={pulseAlerts.resourceMismatches}
              label="Resource Mismatches"
            />
            <AlertBadge
              type="info"
              count={pulseAlerts.missingMedia}
              label="Missing Media"
            />
          </div>
        </div>
      </section>

      {/* BEAM Coin Overview */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-orchestra-gold">BEAM Coin Overview</h2>
          <Link
            href="/admin/coins"
            className="flex items-center space-x-2 text-orchestra-gold hover:text-orchestra-gold/80 transition-colors"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Coins Issued Today"
            value={coinMetrics.issuedToday.toLocaleString()}
            icon={Coins}
            className="bg-green-500/10 border-green-500/30"
          />
          <MetricCard
            title="Coins Redeemed Today"
            value={coinMetrics.redeemedToday.toLocaleString()}
            icon={Coins}
            className="bg-blue-500/10 border-blue-500/30"
          />
          <MetricCard
            title="Outstanding Coins"
            value={coinMetrics.outstanding.toLocaleString()}
            icon={Coins}
            className="bg-orchestra-gold/10 border-orchestra-gold/30"
          />
          <MetricCard
            title="Expiring Soon"
            value={coinMetrics.expiring.toLocaleString()}
            icon={AlertCircle}
            className="bg-red-500/10 border-red-500/30"
          />
        </div>
      </section>

      {/* Projects Snapshot Table */}
      <section>
        <h2 className="text-2xl font-bold text-orchestra-gold mb-6">Projects Snapshot</h2>
        <ProjectsTable projects={projects} />
      </section>

      {/* Ticket Breakdown Modal */}
      {showTicketBreakdownModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowTicketBreakdownModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-orchestra-gold/30 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orchestra-gold">Ticket Sales by Project</h2>
              <button
                onClick={() => setShowTicketBreakdownModal(false)}
                className="text-orchestra-cream/70 hover:text-orchestra-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {ticketBreakdown.length === 0 ? (
              <p className="text-orchestra-cream/70 text-center py-12">No ticket sales data available</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-4 text-sm font-medium text-orchestra-gold border-b border-orchestra-gold/20 pb-2">
                  <div>Project</div>
                  <div className="text-center">Events</div>
                  <div className="text-center">Paid Tickets</div>
                  <div className="text-center">RSVPs</div>
                  <div className="text-center">Total Tickets</div>
                  <div className="text-right">Revenue</div>
                </div>
                {ticketBreakdown.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-6 gap-4 py-3 border-b border-orchestra-gold/10 hover:bg-orchestra-gold/5 rounded-lg px-2"
                  >
                    <div className="font-medium text-orchestra-cream">
                      {item.projectId !== 'unassigned' ? (
                        <Link
                          href={`/admin/projects/${item.projectId}`}
                          className="hover:text-orchestra-gold transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTicketBreakdownModal(false)
                          }}
                        >
                          {item.projectName}
                        </Link>
                      ) : (
                        item.projectName
                      )}
                    </div>
                    <div className="text-center text-orchestra-cream/70">{item.eventCount}</div>
                    <div className="text-center text-green-400 font-medium">{item.paidTickets}</div>
                    <div className="text-center text-blue-400 font-medium">{item.rsvpReservations}</div>
                    <div className="text-center text-orchestra-gold font-bold">{item.totalTickets}</div>
                    <div className="text-right text-green-400 font-medium">
                      ${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-orchestra-gold/20 grid grid-cols-6 gap-4 font-bold">
                  <div className="text-orchestra-gold">Total</div>
                  <div className="text-center text-orchestra-cream/70">
                    {ticketBreakdown.reduce((sum, item) => sum + item.eventCount, 0)}
                  </div>
                  <div className="text-center text-green-400">
                    {ticketBreakdown.reduce((sum, item) => sum + item.paidTickets, 0)}
                  </div>
                  <div className="text-center text-blue-400">
                    {ticketBreakdown.reduce((sum, item) => sum + item.rsvpReservations, 0)}
                  </div>
                  <div className="text-center text-orchestra-gold">
                    {ticketBreakdown.reduce((sum, item) => sum + item.totalTickets, 0)}
                  </div>
                  <div className="text-right text-green-400">
                    ${ticketBreakdown.reduce((sum, item) => sum + item.revenue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
