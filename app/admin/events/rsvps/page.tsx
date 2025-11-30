'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { collection, query, orderBy, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUserRole } from '@/lib/hooks/useUserRole'
import { EventRSVP, Event } from '@/lib/types/events'
import { ArrowLeft, Calendar, Mail, User, Users } from 'lucide-react'
import { format } from 'date-fns'

export default function AdminRSVPsPage() {
  const { user, loading: authLoading } = useUserRole()
  const [rsvps, setRsvps] = useState<(EventRSVP & { event?: Event })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && db) {
      loadRSVPs()
    }
  }, [authLoading])

  const loadRSVPs = async () => {
    if (!db) return
    
    try {
      setLoading(true)
      const rsvpsRef = collection(db, 'eventRSVPs')
      const q = query(rsvpsRef, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      
      const rsvpsData = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const data = docSnapshot.data()
          const rsvp: EventRSVP = {
            id: docSnapshot.id,
            ...data,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp,
          } as EventRSVP

          // Fetch event details
          let event: Event | undefined
          try {
            const eventDoc = await getDoc(doc(db, 'events', rsvp.eventId))
            if (eventDoc.exists()) {
              const eventData = eventDoc.data()
              event = {
                id: eventDoc.id,
                ...eventData,
                date: eventData.date?.toDate ? eventData.date.toDate() : eventData.date,
                createdAt: eventData.createdAt?.toDate ? eventData.createdAt.toDate() : eventData.createdAt,
                updatedAt: eventData.updatedAt?.toDate ? eventData.updatedAt.toDate() : eventData.updatedAt,
              } as Event
            }
          } catch (error) {
            console.error(`Error loading event ${rsvp.eventId}:`, error)
          }

          return { ...rsvp, event }
        })
      )
      
      setRsvps(rsvpsData)
    } catch (error) {
      console.error('Error loading RSVPs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date | Timestamp) => {
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMM d, yyyy h:mm a')
    }
    return format(date, 'MMM d, yyyy h:mm a')
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
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 text-orchestra-gold hover:text-orchestra-gold/80 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-orchestra-gold mb-2">Event RSVPs</h1>
        <p className="text-orchestra-cream/70">View all free event reservations</p>
      </div>

      {rsvps.length === 0 ? (
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg p-12 text-center">
          <Calendar className="h-12 w-12 text-orchestra-gold/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-orchestra-cream mb-2">No RSVPs yet</h3>
          <p className="text-orchestra-cream/70">Reservations will appear here once users reserve free tickets</p>
        </div>
      ) : (
        <div className="bg-orchestra-dark/50 border border-orchestra-gold/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-orchestra-gold/10 border-b border-orchestra-gold/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-orchestra-gold uppercase tracking-wider">
                    Reserved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orchestra-gold/10">
                {rsvps.map((rsvp) => (
                  <tr key={rsvp.id} className="hover:bg-orchestra-gold/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-orchestra-gold" />
                        <div>
                          <p className="text-orchestra-cream font-medium">
                            {rsvp.event?.title || 'Event Not Found'}
                          </p>
                          {rsvp.event && (
                            <p className="text-orchestra-cream/60 text-sm">
                              {rsvp.event.date instanceof Date
                                ? format(rsvp.event.date, 'MMM d, yyyy')
                                : rsvp.event.date instanceof Timestamp
                                ? format(rsvp.event.date.toDate(), 'MMM d, yyyy')
                                : 'Date TBD'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-orchestra-gold" />
                        <span className="text-orchestra-cream">{rsvp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orchestra-gold" />
                        <span className="text-orchestra-cream">{rsvp.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {rsvp.hasPlusOne ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-400" />
                          <span className="text-green-400 font-medium">2 seats</span>
                          {rsvp.plusOneName && (
                            <span className="text-orchestra-cream/70 text-sm">({rsvp.plusOneName})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-orchestra-cream/70">1 seat</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-orchestra-cream/70 text-sm">
                        {formatDate(rsvp.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

