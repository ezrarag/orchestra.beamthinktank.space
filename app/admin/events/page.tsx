'use client'

// TODO: Future expansion hooks:
// - QR code generation for ticket scanning
// - Geo check-in integration for musicians
// - Subscription discount application
// - Media system integration (link events to projectMedia)
// - Partner organization event management (organizationId scoping)

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { Event } from '@/lib/types/events'
import { Plus, Calendar, MapPin, DollarSign, ExternalLink, Edit, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminEventsPage() {
  const { user, loading: authLoading } = useUserRole()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && db) {
      loadEvents()
    }
  }, [authLoading])

  const loadEvents = async () => {
    if (!db) return
    
    try {
      setLoading(true)
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      })) as Event[]
      
      setEvents(eventsData)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMM d, yyyy')
    }
    return format(date, 'MMM d, yyyy')
  }

  const formatDateTime = (date: Date | Timestamp, time: string) => {
    const dateStr = formatDate(date)
    return `${dateStr} at ${time}`
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orchestra-gold"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orchestra-gold mb-2">Events</h1>
          <p className="text-orchestra-cream/70">Manage concerts, performances, and ticketing</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/events/rsvps"
            className="flex items-center gap-2 px-4 py-2 bg-orchestra-gold/20 hover:bg-orchestra-gold/30 text-orchestra-gold font-medium rounded-lg transition-colors border border-orchestra-gold/30"
          >
            <Users className="h-5 w-5" />
            View RSVPs
          </Link>
          <Link
            href="/admin/events/new"
            className="flex items-center gap-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-12 text-center">
          <Calendar className="h-12 w-12 text-orchestra-gold/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-orchestra-cream mb-2">No events yet</h3>
          <p className="text-orchestra-cream/70 mb-6">Create your first event to start selling tickets</p>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orchestra-gold hover:bg-orchestra-gold/90 text-black font-bold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-6 hover:border-orchestra-gold/50 transition-all"
            >
              {event.imageUrl && (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-orchestra-gold text-xs font-medium uppercase tracking-wide mb-1">
                      {event.series}
                    </p>
                    <h3 className="text-xl font-bold text-orchestra-cream mb-2">
                      {event.title}
                    </h3>
                  </div>
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="text-orchestra-gold hover:text-orchestra-gold/80 transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                </div>

                <div className="space-y-2 text-sm text-orchestra-cream/70">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateTime(event.date, event.time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venueName}, {event.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.isFree ? (
                      <>
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-green-400">Free Event</span>
                      </>
                    ) : event.ticketProvider === 'external' ? (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        <span>External Ticketing</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4" />
                        <span>${(event.priceTiers[0]?.price || 0) / 100} - ${(event.priceTiers[event.priceTiers.length - 1]?.price || 0) / 100}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.onSale
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-orchestra-gold/20 text-orchestra-gold'
                    }`}
                  >
                    {event.onSale ? 'On Sale' : 'Not On Sale'}
                  </span>
                </div>

                <Link
                  href={`/admin/events/${event.id}`}
                  className="block w-full mt-4 px-4 py-2 bg-orchestra-gold/10 hover:bg-orchestra-gold/20 text-orchestra-gold text-center font-medium rounded-lg transition-colors"
                >
                  Edit Event
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

