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
  X,
  Video,
  Ticket,
  Edit,
  Trash2
} from 'lucide-react'
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRequireRole, useUserRole } from '@/lib/hooks/useUserRole'
import { useProjectAccess } from '@/lib/hooks/useProjectAccess'
import { Event } from '@/lib/types/events'

function MusiciansList({ musicians }: { musicians: any[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayedMusicians = showAll ? musicians : musicians.slice(0, 9)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
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
  const [ticketReservations, setTicketReservations] = useState<any[]>([])
  const [ticketStats, setTicketStats] = useState({ totalSold: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddMusicianModal, setShowAddMusicianModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

        // Fetch events for this project
        const eventsQuery = query(
          collection(db, 'events'),
          where('projectId', '==', projectId)
        )
        const eventsSnapshot = await getDocs(eventsQuery)
        const eventIds = eventsSnapshot.docs.map(doc => doc.id)
        
        console.log(`Found ${eventIds.length} events for project ${projectId}:`, eventIds)
        
        // Also check if there are any events without projectId that might belong to this project
        // (by checking event title/series for project name)
        if (eventIds.length === 0) {
          console.warn(`No events found with projectId=${projectId}. Checking all events...`)
          const allEventsSnapshot = await getDocs(collection(db, 'events'))
          const allEvents = allEventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Event[]
          console.log('All events in database:', allEvents.map(e => ({
            id: e.id,
            title: e.title,
            projectId: e.projectId || 'NOT SET'
          })))
        }

        // Fetch ticket reservations for these events (both paid orders and free RSVPs)
        if (eventIds.length > 0) {
          try {
            console.log(`Fetching tickets for ${eventIds.length} events:`, eventIds)
            
            // Fetch paid ticket orders
            // Try fetching all orders first (for beam_admin) or filtered by eventIds (for partner_admin)
            let allPaidOrders: any[] = []
            try {
              if (role === 'beam_admin') {
                // Beam admin can query all orders, then filter by eventIds
                const allOrdersQuery = query(collection(db, 'eventOrders'))
                const allOrdersSnapshot = await getDocs(allOrdersQuery)
                allPaidOrders = allOrdersSnapshot.docs
                  .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'paid'
                  }))
                  .filter((order: any) => eventIds.includes(order.eventId))
                  .map((order: any) => ({
                    ...order,
                    eventId: order.eventId
                  }))
                console.log(`Beam admin: Found ${allPaidOrders.length} orders for ${eventIds.length} events`)
              } else {
                // Partner admin: query each event separately
                const ordersPromises = eventIds.map(async (eventId) => {
                  try {
                    // Try with orderBy first (requires index)
                    const ordersQuery = query(
                      collection(db, 'eventOrders'),
                      where('eventId', '==', eventId),
                      orderBy('timestamp', 'desc')
                    )
                    const ordersSnapshot = await getDocs(ordersQuery)
                    const orders = ordersSnapshot.docs.map(doc => ({
                      id: doc.id,
                      ...doc.data(),
                      eventId,
                      type: 'paid'
                    }))
                    console.log(`Found ${orders.length} orders for event ${eventId}`)
                    return orders
                  } catch (error: any) {
                    // If orderBy fails (no index), try without it
                    if (error.code === 'failed-precondition') {
                      console.warn('Index missing for eventOrders.timestamp, fetching without orderBy')
                      const ordersQuery = query(
                        collection(db, 'eventOrders'),
                        where('eventId', '==', eventId)
                      )
                      const ordersSnapshot = await getDocs(ordersQuery)
                      const orders = ordersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        eventId,
                        type: 'paid'
                      }))
                      // Sort manually
                      const sorted = orders.sort((a, b) => {
                        const aTime = a.timestamp?.toDate?.() || a.timestamp || new Date(0)
                        const bTime = b.timestamp?.toDate?.() || b.timestamp || new Date(0)
                        return bTime.getTime() - aTime.getTime()
                      })
                      console.log(`Found ${sorted.length} orders for event ${eventId} (without orderBy)`)
                      return sorted
                    }
                    // Handle permission errors
                    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                      console.warn(`Permission denied fetching orders for event ${eventId}. User may need to refresh token.`)
                      console.warn('Token claims:', await user?.getIdTokenResult().then(r => r.claims))
                      return []
                    }
                    console.error(`Error fetching orders for event ${eventId}:`, error)
                    return []
                  }
                })
                const ordersArrays = await Promise.all(ordersPromises)
                allPaidOrders = ordersArrays.flat()
                console.log(`Partner admin: Found ${allPaidOrders.length} orders total`)
              }
            } catch (error: any) {
              console.error('Error fetching orders:', error)
              if (error.code === 'permission-denied') {
                console.error('PERMISSION ERROR: Partner admin may need to sign out and back in to refresh token.')
              }
              allPaidOrders = []
            }
            
            // Fetch free event RSVPs
            let allRSVPs: any[] = []
            try {
              if (role === 'beam_admin') {
                // Beam admin can query all RSVPs, then filter by eventIds
                const allRSVPsQuery = query(collection(db, 'eventRSVPs'))
                const allRSVPsSnapshot = await getDocs(allRSVPsQuery)
                allRSVPs = allRSVPsSnapshot.docs
                  .map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'rsvp',
                    status: 'confirmed',
                    tickets: [{
                      quantity: doc.data().hasPlusOne ? 2 : 1,
                      subtotal: 0
                    }],
                    totalAmount: 0,
                    userEmail: doc.data().email,
                    name: doc.data().name
                  }))
                  .filter((rsvp: any) => eventIds.includes(rsvp.eventId))
                  .map((rsvp: any) => ({
                    ...rsvp,
                    eventId: rsvp.eventId
                  }))
                console.log(`Beam admin: Found ${allRSVPs.length} RSVPs for ${eventIds.length} events`)
              } else {
                // Partner admin: query each event separately
                const rsvpsPromises = eventIds.map(async (eventId) => {
                  try {
                    const rsvpsQuery = query(
                      collection(db, 'eventRSVPs'),
                      where('eventId', '==', eventId)
                    )
                    const rsvpsSnapshot = await getDocs(rsvpsQuery)
                    const rsvps = rsvpsSnapshot.docs.map(doc => ({
                      id: doc.id,
                      ...doc.data(),
                      eventId,
                      type: 'rsvp',
                      status: 'confirmed',
                      tickets: [{
                        quantity: doc.data().hasPlusOne ? 2 : 1,
                        subtotal: 0
                      }],
                      totalAmount: 0,
                      userEmail: doc.data().email,
                      name: doc.data().name
                    }))
                    console.log(`Found ${rsvps.length} RSVPs for event ${eventId}`)
                    return rsvps
                  } catch (error: any) {
                    // Handle permission errors
                    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
                      console.warn(`Permission denied fetching RSVPs for event ${eventId}. User may need to refresh token.`)
                      return []
                    }
                    console.error('Error fetching RSVPs for event:', eventId, error)
                    return []
                  }
                })
                const rsvpsArrays = await Promise.all(rsvpsPromises)
                allRSVPs = rsvpsArrays.flat()
                console.log(`Partner admin: Found ${allRSVPs.length} RSVPs total`)
              }
            } catch (error: any) {
              console.error('Error fetching RSVPs:', error)
              if (error.code === 'permission-denied') {
                console.error('PERMISSION ERROR: Partner admin may need to sign out and back in to refresh token.')
              }
              allRSVPs = []
            }
            const allReservations = [...allPaidOrders, ...allRSVPs]
            
            console.log(`Total orders: ${allPaidOrders.length}, Total RSVPs: ${allRSVPs.length}, Total reservations: ${allReservations.length}`)
            
            // Calculate ticket statistics
            let totalSold = 0
            let totalRevenue = 0
            
            // Count paid tickets
            allPaidOrders.forEach((order: any) => {
              if (order.status === 'paid' || order.status === 'pending') {
                const ticketCount = order.tickets?.reduce((sum: number, ticket: any) => 
                  sum + (ticket.quantity || 0), 0) || 0
                totalSold += ticketCount
              }
              if (order.status === 'paid') {
                // totalAmount is in cents, convert to dollars
                totalRevenue += (order.totalAmount || 0) / 100
              }
            })
            
            // Count RSVP reservations (including plus ones)
            allRSVPs.forEach((rsvp: any) => {
              const reservationCount = rsvp.hasPlusOne ? 2 : 1
              totalSold += reservationCount
            })
            
            console.log(`Ticket stats calculated: ${totalSold} tickets sold, $${totalRevenue} revenue`)
            setTicketStats({ totalSold, totalRevenue })
            
            // Get event details for each reservation
            const reservationsWithEventDetails = await Promise.all(
              allReservations.map(async (reservation) => {
                try {
                  const eventDoc = await getDoc(doc(db, 'events', reservation.eventId))
                  return {
                    ...reservation,
                    event: eventDoc.exists() ? { id: eventDoc.id, ...eventDoc.data() } : null
                  }
                } catch (error) {
                  console.error('Error fetching event details:', error)
                  return {
                    ...reservation,
                    event: null
                  }
                }
              })
            )
            
            // Sort by timestamp (most recent first)
            reservationsWithEventDetails.sort((a, b) => {
              const aTime = a.timestamp?.toDate?.() || a.timestamp || new Date(0)
              const bTime = b.timestamp?.toDate?.() || b.timestamp || new Date(0)
              return bTime.getTime() - aTime.getTime()
            })
            
            setTicketReservations(reservationsWithEventDetails)
          } catch (error: any) {
            console.error('Error fetching ticket reservations:', error)
            // Check if it's a permission error
            if (error.code === 'permission-denied' || error.message?.includes('permission')) {
              console.error('PERMISSION ERROR: User may need to sign out and back in to refresh token with updated claims.')
              console.error('Error details:', {
                code: error.code,
                message: error.message,
                projectId,
                eventIds
              })
            }
            setTicketReservations([])
            setTicketStats({ totalSold: 0, totalRevenue: 0 })
          }
        } else {
          console.log(`No events found for project ${projectId}, setting ticket stats to 0`)
          setTicketReservations([])
          setTicketStats({ totalSold: 0, totalRevenue: 0 })
        }
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

  const handleEditProject = () => {
    setEditingProject({
      name: project.name || '',
      city: project.city || '',
      status: project.status || 'active',
      description: project.description || '',
      budgetUsd: project.budgetUsd || 0,
      neededMusicians: project.neededMusicians || 0,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
    })
    setShowEditProjectModal(true)
  }

  const handleSaveProject = async () => {
    if (!db || !project || !editingProject) return

    setSaving(true)
    try {
      const updateData: any = {
        name: editingProject.name,
        city: editingProject.city,
        status: editingProject.status,
        description: editingProject.description || '',
        budgetUsd: editingProject.budgetUsd || 0,
        neededMusicians: editingProject.neededMusicians || 0,
        updatedAt: serverTimestamp(),
      }

      if (editingProject.startDate) {
        updateData.startDate = editingProject.startDate
      }
      if (editingProject.endDate) {
        updateData.endDate = editingProject.endDate
      }

      await updateDoc(doc(db, 'projects', projectId), updateData)
      
      // Refresh project data
      const projectRef = doc(db, 'projects', projectId)
      const projectSnap = await getDoc(projectRef)
      if (projectSnap.exists()) {
        setProject({ id: projectSnap.id, ...projectSnap.data() })
      }
      
      setShowEditProjectModal(false)
      setEditingProject(null)
      alert('Project updated successfully!')
    } catch (error: any) {
      console.error('Error updating project:', error)
      alert(`Failed to update project: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!db || !project) return

    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'projects', projectId))
      alert('Project deleted successfully!')
      router.push('/admin/projects')
    } catch (error: any) {
      console.error('Error deleting project:', error)
      alert(`Failed to delete project: ${error.message}`)
      setDeleting(false)
    }
  }

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
    <div className="space-y-8 w-full min-w-0">
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
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <Link
              href="/admin/projects"
              className="flex items-center space-x-2 text-orchestra-cream hover:text-orchestra-gold transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-orchestra-gold mb-2 truncate">
                {project.name || projectId}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-orchestra-cream/70">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {project.city || 'Unknown'}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
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

          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Edit Project Button - Visible to beam_admin and partner_admin */}
            {(role === 'beam_admin' || role === 'partner_admin') && (
              <button
                onClick={handleEditProject}
                className="flex items-center space-x-2 px-4 lg:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-blue-600/20 text-sm lg:text-base"
              >
                <Edit className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="hidden sm:inline">Edit Project</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}

            {/* Delete Project Button - Only visible to beam_admin */}
            {role === 'beam_admin' && (
              <button
                onClick={() => setShowDeleteConfirmModal(true)}
                className="flex items-center space-x-2 px-4 lg:px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-red-600/20 text-sm lg:text-base"
              >
                <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="hidden sm:inline">Delete Project</span>
                <span className="sm:hidden">Delete</span>
              </button>
            )}

            {/* Invite Button */}
            <Link
              href={`/admin/projects/${projectId}/invites`}
              className="flex items-center space-x-2 px-4 lg:px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-all shadow-lg hover:shadow-orchestra-gold/20 text-sm lg:text-base"
            >
              <UserPlus className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="hidden sm:inline">Manage Invites</span>
              <span className="sm:hidden">Invites</span>
            </Link>

            {/* Readyaimgo Subscription Button */}
            <a
              href={`https://readyaimgo.biz/onboard?project=${projectId}&return=${encodeURIComponent(process.env.NEXT_PUBLIC_BASE_URL || 'https://orchestra.beamthinktank.space')}/admin/dashboard`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 lg:px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-600/20 text-sm lg:text-base"
            >
              <Zap className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="hidden sm:inline">Activate Readyaimgo</span>
              <span className="sm:hidden">Readyaimgo</span>
              <ExternalLink className="h-3 w-3 lg:h-4 lg:w-4" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full"
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

        <div className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orchestra-cream/70 text-sm">Tickets Sold</span>
            <Ticket className="h-5 w-5 text-orchestra-gold" />
          </div>
          <p className="text-2xl font-bold text-orchestra-gold">
            {ticketStats.totalSold}
          </p>
          <p className="text-xs text-orchestra-cream/50 mt-1">
            ${ticketStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} revenue
          </p>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"
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

        <Link
          href={`/admin/projects/${projectId}/media`}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-purple-500/30 p-6 hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Video className="h-8 w-8 text-purple-400 group-hover:scale-110 transition-transform" />
            <ArrowLeft className="h-5 w-5 text-orchestra-cream/50 group-hover:text-purple-400 transition-colors rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-purple-400 mb-2">Media Library</h3>
          <p className="text-orchestra-cream/70 text-sm">Upload and manage rehearsal videos</p>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl border border-green-500/30 p-6 hover:border-green-500/50 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Settings className="h-8 w-8 text-green-400 group-hover:scale-110 transition-transform" />
            <ArrowLeft className="h-5 w-5 text-orchestra-cream/50 group-hover:text-green-400 transition-colors rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-green-400 mb-2">Settings</h3>
          <p className="text-orchestra-cream/70 text-sm">Configure project settings and preferences</p>
        </Link>
      </motion.div>

      {/* Ticket Reservations */}
      {ticketReservations.length > 0 && (
        <motion.div
          className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="p-6 border-b border-orchestra-gold/20 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-orchestra-gold flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Ticket Reservations
              </h2>
              <p className="text-orchestra-cream/70 text-sm mt-1">
                {ticketReservations.length} reservation{ticketReservations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/admin/events"
              className="flex items-center space-x-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-orchestra-dark font-bold rounded-lg transition-colors text-sm"
            >
              <Calendar className="h-4 w-4" />
              <span>View All Events</span>
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {ticketReservations.slice(0, 10).map((reservation) => {
                const isRSVP = reservation.type === 'rsvp'
                const ticketCount = isRSVP 
                  ? (reservation.hasPlusOne ? 2 : 1)
                  : (reservation.tickets?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0)
                const email = reservation.userEmail || reservation.email || ''
                const name = reservation.userName || reservation.name || ''
                const amount = isRSVP ? 0 : (reservation.totalAmount || 0) / 100
                const status = isRSVP ? 'confirmed' : (reservation.status || 'pending')
                
                return (
                  <div
                    key={reservation.id}
                    className="bg-orchestra-dark/50 rounded-lg p-4 border border-orchestra-gold/10 hover:border-orchestra-gold/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-orchestra-cream">
                            {reservation.event?.title || 'Event'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === 'paid' || status === 'confirmed'
                              ? 'bg-green-500/20 text-green-400'
                              : status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {isRSVP ? 'RSVP' : status}
                          </span>
                        </div>
                        <div className="text-sm text-orchestra-cream/70 space-y-1">
                          {email && (
                            <p>Email: {email}</p>
                          )}
                          {name && (
                            <p>Name: {name}</p>
                          )}
                          {isRSVP && reservation.hasPlusOne && reservation.plusOneName && (
                            <p>Plus One: {reservation.plusOneName}</p>
                          )}
                          <p>
                            Tickets: {ticketCount}
                          </p>
                          {!isRSVP && (
                            <p>
                              Total: ${amount.toFixed(2)}
                            </p>
                          )}
                          {isRSVP && (
                            <p className="text-green-400 font-medium">Free Event</p>
                          )}
                          {reservation.timestamp && (
                            <p className="text-xs text-orchestra-cream/50">
                              {new Date(reservation.timestamp.toDate?.() || reservation.timestamp).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {ticketReservations.length > 10 && (
                <p className="text-sm text-orchestra-cream/70 text-center pt-2">
                  Showing 10 of {ticketReservations.length} reservations
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Project Musicians List */}
      {musicians.length > 0 && (
        <motion.div
          className="bg-orchestra-cream/5 backdrop-blur-sm rounded-xl border border-orchestra-gold/20 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
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
          <div className="p-6 max-w-full overflow-x-auto">
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

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !saving && setShowEditProjectModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-orchestra-gold/30 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-orchestra-gold">Edit Project</h2>
              <button
                onClick={() => !saving && setShowEditProjectModal(false)}
                disabled={saving}
                className="text-orchestra-cream/70 hover:text-orchestra-cream disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={editingProject.city}
                  onChange={(e) => setEditingProject({ ...editingProject, city: e.target.value })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Status
                </label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-orchestra-cream mb-2">
                  Description
                </label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-orchestra-cream mb-2">
                    Budget (USD)
                  </label>
                  <input
                    type="number"
                    value={editingProject.budgetUsd}
                    onChange={(e) => setEditingProject({ ...editingProject, budgetUsd: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orchestra-cream mb-2">
                    Needed Musicians
                  </label>
                  <input
                    type="number"
                    value={editingProject.neededMusicians}
                    onChange={(e) => setEditingProject({ ...editingProject, neededMusicians: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orchestra-cream mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editingProject.startDate}
                    onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-orchestra-cream mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editingProject.endDate}
                    onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-orchestra-dark/50 border border-orchestra-gold/30 rounded-lg text-orchestra-cream focus:outline-none focus:ring-2 focus:ring-orchestra-gold"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowEditProjectModal(false)}
                disabled={saving}
                className="px-6 py-3 bg-orchestra-dark/50 hover:bg-orchestra-dark/70 text-orchestra-cream rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={saving || !editingProject.name || !editingProject.city}
                className="px-6 py-3 bg-orchestra-gold hover:bg-orchestra-gold/90 disabled:opacity-50 text-orchestra-dark font-bold rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !deleting && setShowDeleteConfirmModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-orchestra-dark border border-red-500/30 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-400">Delete Project</h2>
              <button
                onClick={() => !deleting && setShowDeleteConfirmModal(false)}
                disabled={deleting}
                className="text-orchestra-cream/70 hover:text-orchestra-cream disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-orchestra-cream mb-6">
              Are you sure you want to delete <strong className="text-orchestra-gold">{project?.name}</strong>? 
              This action cannot be undone and will remove all associated data.
            </p>

            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleting}
                className="px-6 py-3 bg-orchestra-dark/50 hover:bg-orchestra-dark/70 text-orchestra-cream rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

